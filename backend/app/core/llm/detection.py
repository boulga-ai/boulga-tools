from app.core.llm.client import complete_json
from app.core.llm.prompts import ai_content_detection, plagiarism_detection

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


def _locate_span(text: str, quote: object) -> tuple[int, int] | None:
    if not isinstance(quote, str) or not quote.strip():
        return None
    idx = text.find(quote)
    if idx == -1:
        return None
    return idx, idx + len(quote)


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

    ai_score = _clamp_score(data.get("ai_score"))
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
        "human_score": round(100 - ai_score, 1),
        "flagged_spans": flagged_spans,
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
    }
    return result, usage
