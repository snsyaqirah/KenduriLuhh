"""
Pelanggan — Customer Interaction Agent
Receives the raw catering request, validates it, and outputs a structured intake brief
before handing off to Tok Penghulu.
"""

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.config import settings
from app.agents.base_agent import build_pelanggan_prompt, build_model_client_args


def create_pelanggan(mode: str, language: str = "ms") -> AssistantAgent:
    client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))
    return AssistantAgent(
        name="Pelanggan",
        model_client=client,
        description="Ejen Pengambilan Pelanggan. Pilih PERTAMA SEKALI untuk menerima dan mengesahkan butiran majlis, mengeluarkan brief berstruktur sebelum pasukan mula merancang.",
        system_message=build_pelanggan_prompt(mode, language),
    )
