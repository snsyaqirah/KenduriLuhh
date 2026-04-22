"""
Mak Tok — Menu Planning Agent
Specialises in Malaysian/Malay and Indian Muslim cuisine, halal compliance, and portion sizing.
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_mak_tok_prompt, build_model_client_args


def create_mak_tok(mode: str, language: str = "ms", menu_excerpt: str = "") -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Mak_Tok",
        model_client=client,
        description="Pakar Menu & Masakan Malaysia. Pilih untuk cadangan hidangan, pengiraan porsi bahan, atau semakan status halal.",
        system_message=build_mak_tok_prompt(mode, language, menu_excerpt),
    )
