import hashlib
import time
import uuid

import httpx

from app.config import settings

AUTH_URL = "https://id.copyleaks.com/v3/account/login/api"
AI_DETECTOR_URL_TEMPLATE = "https://api.copyleaks.com/v2/writer-detector/{scan_id}/check"
PLAGIARISM_SUBMIT_URL_TEMPLATE = "https://api.copyleaks.com/v3/scans/submit/file/{scan_id}"
PLAGIARISM_RESULT_URL_TEMPLATE = "https://api.copyleaks.com/v3/downloads/{scan_id}/result"

_token_cache: dict = {"token": None, "expires_at": 0.0}
_TOKEN_TTL_SECONDS = 24 * 3600

# Etat des scans de plagiat en mode mock (soumission puis polling, comme l'API reelle
# qui est asynchrone). En memoire process : suffisant pour le dev, un compte Copyleaks
# reel remplacerait ceci par un webhook ecrivant directement en base.
_plagiarism_scans: dict = {}
MOCK_SCAN_DELAY_SECONDS = 4


class CopyleaksError(Exception):
    pass


def is_mock_mode() -> bool:
    return not settings.COPYLEAKS_EMAIL or not settings.COPYLEAKS_API_KEY


async def _get_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                AUTH_URL,
                json={"email": settings.COPYLEAKS_EMAIL, "key": settings.COPYLEAKS_API_KEY},
            )
            response.raise_for_status()
        token = response.json()["access_token"]
    except (httpx.HTTPError, KeyError) as exc:
        raise CopyleaksError(f"Authentification Copyleaks impossible : {exc}") from exc

    _token_cache["token"] = token
    _token_cache["expires_at"] = now + _TOKEN_TTL_SECONDS
    return token


def _mock_score(text: str) -> dict:
    """Score deterministe (hash du texte) pour le dev sans cle Copyleaks — meme texte,
    meme score, comportement stable pour les tests et demos."""
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    ai_score = round(5 + (int(digest[:8], 16) % 9000) / 100, 1)  # 5.0 - 95.0
    human_score = round(100 - ai_score, 1)

    words = text.split()
    flagged_spans = []
    if len(words) > 12:
        chunk = " ".join(words[: min(10, len(words) // 3)])
        if chunk:
            flagged_spans.append({"text": chunk, "start": 0, "end": len(chunk)})

    return {
        "ai_score": ai_score,
        "human_score": human_score,
        "flagged_spans": flagged_spans,
        "mock": True,
    }


async def scan_ai_content(text: str) -> dict:
    """Renvoie {ai_score, human_score, flagged_spans}. Mode mock si aucune cle Copyleaks
    n'est configuree (COPYLEAKS_EMAIL vide)."""
    if is_mock_mode():
        return _mock_score(text)

    token = await _get_token()
    scan_id = str(uuid.uuid4())

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                AI_DETECTOR_URL_TEMPLATE.format(scan_id=scan_id),
                headers={"Authorization": f"Bearer {token}"},
                json={"text": text},
            )
            response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise CopyleaksError(f"Le service de detection IA est indisponible : {exc}") from exc

    # Forme de reponse a valider/ajuster contre la documentation Copyleaks au moment du
    # branchement reel du compte (v2 AI Content Detector).
    summary = data.get("summary", {})
    ai_score = round(summary.get("ai", 0) * 100, 1)
    return {
        "ai_score": ai_score,
        "human_score": round(100 - ai_score, 1),
        "flagged_spans": data.get("results", {}).get("ai", []),
        "mock": False,
    }


def _mock_plagiarism_result(text: str) -> dict:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    similarity_score = round(2 + (int(digest[8:16], 16) % 6000) / 100, 1)  # 2.0 - 62.0

    words = text.split()
    flagged_spans = []
    if len(words) > 15:
        chunk = " ".join(words[: min(12, len(words) // 3)])
        flagged_spans.append(
            {
                "text": chunk,
                "start": 0,
                "end": len(chunk),
                "similarity": round(60 + (int(digest[16:20], 16) % 3500) / 100, 1),
                "source_url": "https://exemple.org/source-suspectee",
            }
        )
    return {"similarity_score": similarity_score, "flagged_spans": flagged_spans, "mock": True}


async def submit_plagiarism_scan(text: str) -> str:
    """Soumet un scan de plagiat. Renvoie un scan_id a interroger via
    get_plagiarism_result (l'API Copyleaks reelle est asynchrone, par webhook)."""
    scan_id = str(uuid.uuid4())

    if is_mock_mode():
        _plagiarism_scans[scan_id] = {
            "status": "processing",
            "created_at": time.time(),
            "text": text,
        }
        return scan_id

    # Chemin reel Copyleaks : soumission asynchrone avec callback webhook. A implementer
    # au moment du branchement effectif du compte (URL de callback publique requise).
    raise CopyleaksError("Integration Copyleaks reelle non configuree pour le plagiat.")


async def get_plagiarism_result(scan_id: str) -> dict:
    entry = _plagiarism_scans.get(scan_id)
    if entry is None:
        raise CopyleaksError("Scan introuvable ou expire.")

    if entry["status"] == "processing":
        elapsed = time.time() - entry["created_at"]
        if elapsed < MOCK_SCAN_DELAY_SECONDS:
            return {"status": "processing"}
        entry["status"] = "completed"
        entry["result"] = _mock_plagiarism_result(entry["text"])

    return {"status": "completed", **entry["result"]}
