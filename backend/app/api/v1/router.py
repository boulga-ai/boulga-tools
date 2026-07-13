from fastapi import APIRouter

from app.api.v1 import admin, documents, quota, users
from app.api.v1.tools import academic, analyzers, chat, converter, generators, planner, transformers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router)
api_router.include_router(quota.router)
api_router.include_router(transformers.router)
api_router.include_router(chat.router)
api_router.include_router(converter.router)
api_router.include_router(analyzers.router)
api_router.include_router(documents.router)
api_router.include_router(generators.router)
api_router.include_router(planner.router)
api_router.include_router(academic.router)
api_router.include_router(admin.router)
