"""
Abang Lorry — Logistics Agent
Plans preparation timelines, delivery schedules, and flags weather or traffic risks.
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_abang_lorry_prompt, build_model_client_args


def create_abang_lorry(mode: str, language: str = "ms", weather_data: str = "") -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Abang_Lorry",
        model_client=client,
        description="Koordinator Logistik & Penghantaran. Pilih untuk jadual penyediaan makanan, rancangan penghantaran, atau penilaian risiko cuaca dan trafik.",
        system_message=build_abang_lorry_prompt(mode, language, weather_data),
    )
