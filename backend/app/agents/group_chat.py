"""
group_chat.py — KenduriLuhh Multi-Agent Orchestration

Wires the 5 agents into a SelectorGroupChat where an LLM picks who speaks next
based on each agent's description. Tok_Penghulu leads; the team ends when he
writes "SELESAI".

Usage:
    from app.agents.group_chat import create_team, run_team_stream

    team = create_team(mode="katering")
    async for agent_name, content in run_team_stream(team, task):
        print(f"[{agent_name}]: {content}")
"""

from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.conditions import TextMentionTermination, MaxMessageTermination
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient
from autogen_agentchat.base import TaskResult

from app.config import settings
from app.agents.base_agent import build_model_client_args
from app.agents.tok_penghulu import create_tok_penghulu
from app.agents.mak_tok import create_mak_tok
from app.agents.tokey_pasar import create_tokey_pasar
from app.agents.bendahari import create_bendahari
from app.agents.abang_lorry import create_abang_lorry

# Custom selector prompt — guides the LLM to pick the right agent.
# {roles} and {participants} are filled in by SelectorGroupChat automatically.
SELECTOR_PROMPT = """You are the agent selector for KenduriLuhh catering AI.

Available agents and their roles:
{roles}

Conversation history so far:
{history}

STRICT SELECTION RULES — follow in priority order:

RULE 0 (Force close): Count the total number of agent messages in the history above.
  If there are 14 or more agent messages → ALWAYS select Tok_Penghulu to close with SELESAI. No exceptions.

RULE 1 (Start): No agent has spoken yet → select Tok_Penghulu.

RULE 2 (Menu): Tok_Penghulu just opened → select Mak_Tok.

RULE 3 (Pricing): Mak_Tok just proposed a menu → select Tokey_Pasar.

RULE 4 (Budget audit): Tokey_Pasar just gave a price report → select Bendahari.
  MANDATORY. Never skip. Bendahari is the ONLY agent who can approve or reject the budget.

RULE 5 (Revision): Bendahari said GAGAL or FAILED → select Mak_Tok for a cheaper menu.
  After Mak_Tok revises → select Tokey_Pasar to re-price → then Bendahari again to re-audit.
  This revision cycle happens at most ONCE. Do not loop more than once.

RULE 6 (Logistics): Bendahari said LULUS → select Abang_Lorry IMMEDIATELY.
  Do NOT go back to Mak_Tok or Tokey_Pasar after LULUS. Straight to Abang_Lorry.

RULE 7 (Close): Abang_Lorry just finished logistics → select Tok_Penghulu.
  Tok_Penghulu MUST output a summary and the word SELESAI in this message.

PROHIBITED SELECTIONS:
- Do NOT select Mak_Tok, Tokey_Pasar, Bendahari, or Abang_Lorry after Abang_Lorry has finished.
- Do NOT select any agent who has already completed their role to give "motivational" or "supportive" messages.
- Do NOT let agents respond to each other's cheerleading.

Select ONE agent name from: {participants}
Return ONLY the agent name, nothing else.
"""


def create_team(mode: str = "katering", language: str = "ms", weather_data: str = "") -> SelectorGroupChat:
    """
    Creates and returns a configured 5-agent SelectorGroupChat team.

    Args:
        mode: "katering" (professional) or "rewang" (DIY kenduri)
        language: "ms" (Bahasa Malaysia) or "en" (English)
        weather_data: Pre-fetched weather block for Abang_Lorry's system prompt

    Returns:
        A ready-to-run SelectorGroupChat instance.
    """
    selector_client = AzureOpenAIChatCompletionClient(**build_model_client_args(settings))

    tok_penghulu = create_tok_penghulu(mode, language)
    mak_tok = create_mak_tok(mode, language)
    tokey_pasar = create_tokey_pasar(mode, language)
    bendahari = create_bendahari(mode, language)
    abang_lorry = create_abang_lorry(mode, language, weather_data)

    # TextMentionTermination: ends when any agent writes "SELESAI"
    # MaxMessageTermination: safety cap to avoid infinite loops and burning tokens
    termination = TextMentionTermination("SELESAI") | MaxMessageTermination(18)

    team = SelectorGroupChat(
        participants=[tok_penghulu, mak_tok, tokey_pasar, bendahari, abang_lorry],
        model_client=selector_client,
        termination_condition=termination,
        selector_prompt=SELECTOR_PROMPT,
        allow_repeated_speaker=False,
    )

    return team


async def run_team_stream(team: SelectorGroupChat, task: str):
    """
    Async generator that runs the team and yields (agent_name, content) tuples.
    Use this in FastAPI SSE routes or test scripts.

    Args:
        team: A SelectorGroupChat instance from create_team()
        task: The user's catering request as a plain string

    Yields:
        Tuples of (agent_name: str, content: str)
        The last tuple will be ("__DONE__", summary) when the team finishes.
    """
    async for message in team.run_stream(task=task):
        if isinstance(message, TaskResult):
            # Final result — yield a sentinel so callers know the stream ended
            total = len(message.messages)
            yield ("__DONE__", f"Selesai. Jumlah mesej: {total}")
        else:
            agent_name = getattr(message, "source", "System")
            content = getattr(message, "content", str(message))
            if content and agent_name:
                yield (agent_name, content)
