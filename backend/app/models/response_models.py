"""
response_models.py — Pydantic output schemas for API responses.
"""

from typing import Literal
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = "1.0.0"
    project: str = "KenduriLuhh"
    azure_deployment: str
    agents: list[str] = [
        "Tok_Penghulu", "Mak_Tok", "Tokey_Pasar", "Bendahari", "Abang_Lorry"
    ]


class ChatStartResponse(BaseModel):
    session_id: str
    mode: str
    status: Literal["pending"] = "pending"
    message: str = "Agent team started. Poll /api/chat/{session_id}/result for output."


class AgentMessage(BaseModel):
    agent: str
    content: str
    timestamp: str


class ChatResultResponse(BaseModel):
    session_id: str
    mode: str
    status: Literal["pending", "running", "done", "error"]
    messages: list[AgentMessage] = []
    final_result: AgentMessage | None = None
    error: str | None = None
    total_messages: int = 0


class MenuItemResponse(BaseModel):
    id: str
    name: str
    name_en: str
    category: str
    suitable_for: list[str]
    halal_status: str
    prep_time_hours: float
    cook_time_hours: float
    katering_unit_cost_myr: float
    rewang_measurement: str


class IngredientResponse(BaseModel):
    id: str
    name_ms: str
    name_en: str
    category: str
    unit: str
    pasar_borong_price_myr: float
    retail_price_myr: float
    halal_certified: bool
