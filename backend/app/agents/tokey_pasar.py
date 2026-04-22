"""
Tokey Pasar — Inventory & Procurement Agent
Knows Pasar Borong prices, flags expensive ingredients, and suggests cost-saving substitutions.
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_tokey_pasar_prompt, build_model_client_args


def create_tokey_pasar(mode: str, ingredient_table: str = "") -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Tokey_Pasar",
        model_client=client,
        description="Pakar Perolehan & Inventori Bahan. Pilih untuk semakan harga di Pasar Borong, ketersediaan stok, atau cadangan pengganti bahan yang lebih murah.",
        system_message=build_tokey_pasar_prompt(mode, ingredient_table),
    )
