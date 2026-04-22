"""
KenduriLuhh — Rewang Mode Test

Scenario (in English): A family wants to organise a aqiqah feast for 80 guests
themselves (gotong-royong style). Budget RM1,200 only.

Run from backend/ directory:
    cd backend
    PYTHONUTF8=1 python test_rewang.py
"""

import asyncio
import sys
import os

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

from app.agents.group_chat import create_team, run_team_stream

RESET = "\033[0m"
BOLD = "\033[1m"

AGENT_STYLES = {
    "Tok_Penghulu": ("\033[34m", "👴🏽 TOK PENGHULU"),
    "Mak_Tok":      ("\033[33m", "👵🏽 MAK TOK"),
    "Tokey_Pasar":  ("\033[32m", "🛒 TOKEY PASAR"),
    "Bendahari":    ("\033[31m", "📊 BENDAHARI"),
    "Abang_Lorry":  ("\033[37m", "🚛 ABANG LORRY"),
}


def print_agent_message(agent_name: str, content: str, msg_index: int) -> None:
    colour, label = AGENT_STYLES.get(agent_name, ("\033[35m", f"🤖 {agent_name}"))
    divider = "─" * 70
    print(f"\n{colour}{BOLD}{divider}{RESET}")
    print(f"{colour}{BOLD}[{msg_index}] {label}{RESET}")
    print(f"{colour}{divider}{RESET}")
    print(content)


# English input — proves the agents handle bilingual requests
REWANG_TASK = """
Hi! We are planning an aqiqah feast for 80 guests next Saturday (17 May 2026)
at our house in Petaling Jaya, Selangor.

We want to cook everything ourselves (rewang/gotong-royong with family).
Our total budget is RM1,200 only.

Suggested menu: Nasi Tomato with Ayam Masak Merah and Dalca.
Please give us a shopping list with household measurements (gantang, cupan etc.)
so we can buy from the pasar malam or Mydin.
"""


async def main():
    print("\033[32m" + "=" * 70 + RESET)
    print(f"\033[32m{BOLD}🌿 KenduriLuhh — REWANG MODE TEST (English Input) 🌿{RESET}")
    print("\033[32m" + "=" * 70 + RESET)
    print(f"\n📋 Request:\n{REWANG_TASK.strip()}")
    print("\n\033[32m" + "=" * 70 + RESET)
    print(f"\033[32m{BOLD}Starting Rewang Mode (DIY Kenduri)...{RESET}")
    print("\033[32m" + "=" * 70 + RESET)

    # ← KEY DIFFERENCE: mode="rewang"
    team = create_team(mode="rewang")
    msg_index = 0

    async for agent_name, content in run_team_stream(team, REWANG_TASK):
        if agent_name == "__DONE__":
            print(f"\n\033[32m{'=' * 70}{RESET}")
            print(f"\033[32m{BOLD}✅ {content}{RESET}")
            print(f"\033[32m{'=' * 70}{RESET}\n")
        else:
            msg_index += 1
            print_agent_message(agent_name, content, msg_index)

    print(f"\n\033[32m{BOLD}🎉 Rewang test done!{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())
