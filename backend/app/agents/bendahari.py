"""
Bendahari — Pricing & Optimization Agent
The strict financial controller. Validates budgets, rejects over-budget menus, and calculates profit margins.
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_bendahari_prompt, build_model_client_args


def create_bendahari(mode: str) -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Bendahari",
        model_client=client,
        description="Pengawal Kewangan & Pengoptimum Harga. Pilih untuk pengiraan jumlah kos, pengesahan bajet dalam MYR, atau kiraan margin untung dan harga sebut harga.",
        system_message=build_bendahari_prompt(mode),
    )
