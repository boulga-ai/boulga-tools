import re

from app.core.llm.client import complete_json
from app.core.llm.prompts import ai_content_detection, plagiarism_detection

# Variantes d'apostrophe/guillemet simple rencontrees selon l'origine du texte (saisie
# directe, extraction PDF/DOCX) et la normalisation que le LLM applique en "citant" un
# passage - toutes doivent matcher la meme citation.
_APOSTROPHE_VARIANTS = "['’‘ʼ`´]"

# Texte tronque avant analyse : un echantillon suffit pour un score heuristique, et ca
# plafonne le cout token meme sur un document proche de la limite de 50 000 caracteres
# du formulaire (voir plan de detection LLM interimaire).
MAX_DETECTION_CHARS = 12_000

# Recherche web (plagiat uniquement) : plafonnee a 3 resultats pour contenir le cout
# (OpenRouter/Exa facture par resultat, voir client.py).
PLAGIARISM_SEARCH_PLUGINS = [{"id": "web", "max_results": 3}]


def _clamp_score(value: object) -> float:
    try:
        score = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    return round(min(max(score, 0.0), 100.0), 1)


def _normalize_three_way(ai: float, mixed: float, human: float) -> tuple[float, float, float]:
    """Renormalise les 3 scores pour qu'ils somment exactement a 100 (le LLM ne le
    garantit pas toujours). Si le modele n'a rien renvoye d'exploitable, retombe sur
    100% humain plutot que d'affirmer un score IA sans fondement."""
    total = ai + mixed + human
    if total <= 0:
        return 0.0, 0.0, 100.0
    scale = 100.0 / total
    ai_scaled = round(ai * scale, 1)
    mixed_scaled = round(mixed * scale, 1)
    human_scaled = round(100 - ai_scaled - mixed_scaled, 1)
    return ai_scaled, mixed_scaled, human_scaled


def _build_flexible_pattern(quote: str) -> re.Pattern[str] | None:
    """Construit un motif regex tolerant a partir d'une citation : les espaces/sauts de
    ligne entre mots deviennent \\s+ (l'extraction PDF/DOCX et le LLM ne normalisent pas
    forcement les espaces de la meme facon) et les apostrophes/guillemets simples
    acceptent toutes leurs variantes typographiques."""
    words = quote.split()
    if not words:
        return None
    escaped_words = [re.escape(w).replace("'", _APOSTROPHE_VARIANTS) for w in words]
    pattern = r"\s+".join(escaped_words)
    try:
        return re.compile(pattern)
    except re.error:
        return None


def _locate_span(text: str, quote: object) -> tuple[int, int] | None:
    if not isinstance(quote, str) or not quote.strip():
        return None
    pattern = _build_flexible_pattern(quote.strip())
    if pattern is None:
        return None
    match = pattern.search(text)
    if match is None:
        return None
    return match.start(), match.end()


async def detect_ai_content(text: str, model: str) -> tuple[dict, dict]:
    """Estime la probabilite qu'un texte soit genere par IA via un LLM dedie (solution
    interimaire en attendant l'integration Originality.ai). Renvoie
    ({ai_score, human_score, flagged_spans}, usage)."""
    sample = text[:MAX_DETECTION_CHARS]
    messages = [
        {"role": "system", "content": ai_content_detection.SYSTEM_PROMPT},
        {"role": "user", "content": ai_content_detection.build_user_message(sample)},
    ]
    data, usage = await complete_json(model, messages)

    ai_score, mixed_score, human_score = _normalize_three_way(
        _clamp_score(data.get("ai_score")),
        _clamp_score(data.get("mixed_score")),
        _clamp_score(data.get("human_score")),
    )
    flagged_spans = []
    for item in data.get("assessment") or []:
        if not isinstance(item, dict):
            continue
        span = _locate_span(sample, item.get("quote"))
        if span is None:
            continue
        start, end = span
        flagged_spans.append({"start": start, "end": end, "reason": item.get("reason", "")})

    result = {
        "ai_score": ai_score,
        "mixed_score": mixed_score,
        "human_score": human_score,
        "flagged_spans": flagged_spans,
        "sample_word_count": len(sample.split()),
    }
    return result, usage


async def detect_plagiarism(text: str, model: str) -> tuple[dict, dict]:
    """Estime le taux de contenu potentiellement plagie via un LLM avec recherche web
    (solution interimaire en attendant l'integration Originality.ai). Renvoie
    ({similarity_score, flagged_spans}, usage)."""
    sample = text[:MAX_DETECTION_CHARS]
    messages = [
        {"role": "system", "content": plagiarism_detection.SYSTEM_PROMPT},
        {"role": "user", "content": plagiarism_detection.build_user_message(sample)},
    ]
    data, usage = await complete_json(model, messages, plugins=PLAGIARISM_SEARCH_PLUGINS)

    flagged_spans = []
    for item in data.get("matches") or []:
        if not isinstance(item, dict):
            continue
        source_url = item.get("source_url")
        if not isinstance(source_url, str) or not source_url.startswith("http"):
            continue
        span = _locate_span(sample, item.get("quote"))
        if span is None:
            continue
        start, end = span
        flagged_spans.append(
            {
                "start": start,
                "end": end,
                "text": sample[start:end],
                "similarity": _clamp_score(item.get("similarity")),
                "source_url": source_url,
            }
        )

    result = {
        "similarity_score": _clamp_score(data.get("similarity_score")),
        "flagged_spans": flagged_spans,
        "sample_word_count": len(sample.split()),
    }
    return result, usage
