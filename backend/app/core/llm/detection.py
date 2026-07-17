import re

from app.core.llm.client import complete_json
from app.core.llm.prompts import ai_content_detection, plagiarism_detection
from app.core.llm.router import TIER_GROUPS

# Variantes d'apostrophe/guillemet simple rencontrees selon l'origine du texte (saisie
# directe, extraction PDF/DOCX) et la normalisation que le LLM applique en "citant" un
# passage - toutes doivent matcher la meme citation.
_APOSTROPHE_VARIANTS = "['’‘ʼ`´]"

# Texte tronque avant analyse (plagiat uniquement, cf. detect_plagiarism) : un
# echantillon suffit pour un score heuristique, et ca plafonne le cout token meme sur un
# document proche de la limite de 50 000 caracteres du formulaire.
MAX_DETECTION_CHARS = 12_000

# Nombre de pages analysees pour le detecteur IA, selon le palier — meme regroupement
# que le routing des modeles (TIER_GROUPS). Un seul appel LLM couvre toutes les pages
# retenues (pas un appel par page, qui multiplierait le cout par la longueur du doc).
PAGE_LIMITS = {
    "introduction": 5,
    "goutte_source": 15,
    "fleuve_ocean": 40,
}
# Filet de securite cout meme sur peu de pages tres denses.
MAX_TOTAL_PAGE_CHARS = 20_000

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


# Tailles de fenetre essayees en repli, dans l'ordre (la plus specifique d'abord). Une
# seule mauvaise fenetre de 5 mots peut etre "empoisonnee" par un mot divergent au
# centre d'une courte citation (chaque fenetre de 5 mots la contient alors forcement) -
# retenter avec des fenetres plus petites augmente les chances de contourner le mot
# divergent, au prix d'un surlignage moins specifique.
_PARTIAL_MATCH_WINDOW_SIZES = (5, 3)


def _search_windows(text: str, words: list[str], window_size: int) -> tuple[int, int] | None:
    if len(words) <= window_size:
        return None
    for i in range(len(words) - window_size + 1):
        window_pattern = _build_flexible_pattern(" ".join(words[i : i + window_size]))
        if window_pattern is None:
            continue
        match = window_pattern.search(text)
        if match is not None:
            return match.start(), match.end()
    return None


def _locate_span(text: str, quote: object) -> tuple[int, int] | None:
    """Cherche la citation complete d'abord ; si le LLM l'a legerement paraphrasee (un
    mot en plus/different quelque part dans la citation) et que le motif complet
    echoue, balaie des fenetres de mots glissant sur toute la citation, en retrecissant
    progressivement (voir _PARTIAL_MATCH_WINDOW_SIZES) — un surlignage partiel vaut
    mieux qu'aucun surlignage. Ne renvoie jamais de position inventee : chaque repli
    reste une recherche reelle dans le texte fourni."""
    if not isinstance(quote, str) or not quote.strip():
        return None
    quote = quote.strip()

    pattern = _build_flexible_pattern(quote)
    if pattern is not None:
        match = pattern.search(text)
        if match is not None:
            return match.start(), match.end()

    words = quote.split()
    for window_size in _PARTIAL_MATCH_WINDOW_SIZES:
        span = _search_windows(text, words, window_size)
        if span is not None:
            return span

    return None


def _select_pages(pages: list[str], tier: str) -> list[str]:
    """Retient les N premieres pages selon le palier (voir PAGE_LIMITS), puis applique
    un filet de securite en caracteres cumules au cas ou ces pages seraient tres
    denses."""
    group = TIER_GROUPS.get(tier, "introduction")
    max_pages = PAGE_LIMITS.get(group, PAGE_LIMITS["introduction"])
    selected = pages[:max_pages]

    capped: list[str] = []
    total = 0
    for page in selected:
        if total >= MAX_TOTAL_PAGE_CHARS:
            break
        remaining = MAX_TOTAL_PAGE_CHARS - total
        capped.append(page[:remaining])
        total += len(page[:remaining])
    return capped


async def detect_ai_content(pages: list[str], tier: str, model: str) -> tuple[dict, dict]:
    """Estime la probabilite qu'un texte soit genere par IA, page par page, via un LLM
    dedie (solution interimaire en attendant l'integration Originality.ai). Un seul
    appel LLM couvre toutes les pages retenues pour ce palier (voir _select_pages).
    Renvoie ({ai_score, mixed_score, human_score, page_scores, flagged_spans, text,
    pages_analyzed, total_pages}, usage)."""
    selected_pages = _select_pages(pages, tier)
    combined_text = "\n\n".join(selected_pages)
    paginated_text = "\n\n".join(
        f"--- PAGE {i + 1} ---\n{page}" for i, page in enumerate(selected_pages)
    )

    messages = [
        {"role": "system", "content": ai_content_detection.SYSTEM_PROMPT},
        {
            "role": "user",
            "content": ai_content_detection.build_user_message(
                paginated_text, len(selected_pages)
            ),
        },
    ]
    data, usage = await complete_json(model, messages)

    ai_score, mixed_score, human_score = _normalize_three_way(
        _clamp_score(data.get("ai_score")),
        _clamp_score(data.get("mixed_score")),
        _clamp_score(data.get("human_score")),
    )

    flagged_spans = []
    for item in data.get("sentences") or []:
        if not isinstance(item, dict):
            continue
        span = _locate_span(combined_text, item.get("quote"))
        if span is None:
            continue
        start, end = span
        flagged_spans.append(
            {"start": start, "end": end, "ai_score": _clamp_score(item.get("ai_score"))}
        )

    page_scores = []
    for i, item in enumerate((data.get("pages") or [])[: len(selected_pages)]):
        if not isinstance(item, dict):
            continue
        too_short = bool(item.get("too_short"))
        page_scores.append(
            {
                "page": i + 1,
                "ai_score": None if too_short else _clamp_score(item.get("ai_score")),
                "too_short": too_short,
            }
        )

    result = {
        "text": combined_text,
        "ai_score": ai_score,
        "mixed_score": mixed_score,
        "human_score": human_score,
        "page_scores": page_scores,
        "flagged_spans": flagged_spans,
        "pages_analyzed": len(selected_pages),
        "total_pages": len(pages),
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
