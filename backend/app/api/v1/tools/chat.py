from fastapi import APIRouter, Depends, HTTPException, status

from app.core.conversations import delete_conversation, get_conversation, list_conversations
from app.dependencies import get_current_user

router = APIRouter(prefix="/tools/chat", tags=["chat"])


@router.get("/conversations")
async def get_conversations(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_conversations(user["user_id"], "chat")


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: str, user: dict = Depends(get_current_user)
) -> dict:
    conversation = get_conversation(user["user_id"], "chat", conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation introuvable."
        )
    return conversation


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(
    conversation_id: str, user: dict = Depends(get_current_user)
) -> dict:
    delete_conversation(user["user_id"], "chat", conversation_id)
    return {"status": "ok"}
