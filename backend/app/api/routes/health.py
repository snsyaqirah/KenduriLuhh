from fastapi import APIRouter
from app.config import settings
from app.models.response_models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT)
