"""
Pemantau — Monitoring & Risk Agent
Reviews the full negotiation after Abang_Lorry, flags risks, and confirms
execution readiness before Tok_Penghulu closes with SELESAI.
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_pemantau_prompt, build_model_client_args


def create_pemantau(mode: str, language: str = "ms") -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Pemantau",
        model_client=client,
        description="Ejen Pemantauan & Risiko. Pilih selepas Abang_Lorry selesai logistik untuk semak risiko bajet, halal, masa, inventori, dan cuaca sebelum penutupan.",
        system_message=build_pemantau_prompt(mode, language),
    )
