"""CRUD des sessions documentaires, generique par outil (tool) : persiste/restaure
le work_state entre deux visites pour les outils a projets multiples/longue duree
(academique, document pro — CV/lettre pourront rejoindre VALID_TOOLS plus tard). Le
dialogue et la generation eux-memes passent par le routeur generique
documents_engine.py (doc_type=...), inchange — ce fichier ne fait que persister le
JSON d'etat entre deux visites."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.document_sessions import create_session, get_session, list_sessions, update_session
from app.dependencies import get_current_user
from app.models.document_sessions import CreateSessionRequest, UpdateSessionRequest

# Outils avec projets multiples/longue duree, donc sessions persistees cote backend
# (par opposition a CV/Lettre, qui restent un brouillon local par navigateur).
VALID_TOOLS = {"academic", "pro_doc"}

# Pas de rate_limit_dep ici (contrairement a documents_engine.py) : ce routeur ne fait
# que persister du JSON de bookkeeping (nom de projet, work_state), jamais d'appel LLM
# — le budget de 10 appels/minute pense pour un abus de quota gratuit se declenchait a
# tort ici (409/429 en rafale sur un simple renommage + sauvegarde debounced), sans
# aucun rapport avec un cout reel a proteger.
router = APIRouter(prefix="/tools/generators/{tool}", tags=["document_sessions"])


def _check_tool(tool: str) -> None:
    if tool not in VALID_TOOLS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Outil inconnu : {tool}")


def _get_session_or_404(user_id: str, tool: str, session_id: str) -> dict:
    session = get_session(user_id, tool, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable.")
    return session


@router.post("/sessions")
async def create_document_session(
    tool: str, body: CreateSessionRequest, user: dict = Depends(get_current_user)
) -> dict:
    _check_tool(tool)
    return create_session(user["user_id"], tool, body.doc_type)


@router.get("/sessions")
async def get_sessions(tool: str, user: dict = Depends(get_current_user)) -> list[dict]:
    _check_tool(tool)
    return list_sessions(user["user_id"], tool)


@router.get("/sessions/{session_id}")
async def get_session_detail(
    tool: str, session_id: str, user: dict = Depends(get_current_user)
) -> dict:
    _check_tool(tool)
    return _get_session_or_404(user["user_id"], tool, session_id)


@router.patch("/sessions/{session_id}")
async def patch_session(
    tool: str, session_id: str, body: UpdateSessionRequest, user: dict = Depends(get_current_user)
) -> dict:
    _check_tool(tool)
    _get_session_or_404(user["user_id"], tool, session_id)
    updated = update_session(user["user_id"], tool, session_id, body.to_fields())
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable.")
    return updated
