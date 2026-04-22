"""
main.py — KenduriLuhh FastAPI application entry point.

Run with:
    cd backend
    PYTHONUTF8=1 uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import health, chat, knowledge


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🍛 KenduriLuhh backend starting...")
    print(f"   Azure endpoint : {settings.AZURE_OPENAI_ENDPOINT}")
    print(f"   Deployment     : {settings.AZURE_OPENAI_DEPLOYMENT}")
    print(f"   CORS origins   : {settings.cors_origins_list}")
    yield
    print("KenduriLuhh backend shutting down.")


app = FastAPI(
    title="KenduriLuhh API",
    description="AI-powered multi-agent catering management system — iNextLabs - Hackathon 2026",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["System"])
app.include_router(chat.router, prefix="/api", tags=["Agent Chat"])
app.include_router(knowledge.router, prefix="/api", tags=["Knowledge Base"])


@app.get("/", include_in_schema=False)
async def root():
    return {
        "project": "KenduriLuhh",
        "tagline": "AI Catering Manager — The Future of Rewang",
        "docs": "/docs",
        "health": "/api/health",
    }
