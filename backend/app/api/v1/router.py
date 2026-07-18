from fastapi import APIRouter

from app.api.v1 import admin, documents, quota, users
from app.api.v1.tools import (
    analyzers,
    chat,
    converter,
    document_sessions,
    documents_engine,
    planner,
    saved_generations,
    transformers,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router)
api_router.include_router(quota.router)
api_router.include_router(transformers.router)
api_router.include_router(chat.router)
api_router.include_router(converter.router)
api_router.include_router(analyzers.router)
api_router.include_router(documents.router)
api_router.include_router(documents_engine.router)
api_router.include_router(planner.router)
api_router.include_router(document_sessions.router)
api_router.include_router(saved_generations.router)
api_router.include_router(admin.router)
