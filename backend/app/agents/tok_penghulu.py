"""
Tok Penghulu — Orchestrator Agent
Manages the full workflow, resolves conflicts between agents, and ends the session with "SELESAI".
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_tok_penghulu_prompt, build_model_client_args


def create_tok_penghulu(mode: str) -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Tok_Penghulu",
        model_client=client,
        description="Pengurus Utama & Orkestrator. Pilih untuk memulakan tugasan, menyelesaikan konflik antara ejen, atau merumuskan keputusan akhir dengan 'SELESAI'.",
        system_message=build_tok_penghulu_prompt(mode),
    )
