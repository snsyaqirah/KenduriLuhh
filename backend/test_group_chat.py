"""
KenduriLuhh — 5-Agent Group Chat Stress Test (Day 2)

Scenario: User wants Rendang Daging + Sambal Udang Besar for 300 pax
but only has RM6,000 budget.

Expected flow:
  1. Tok_Penghulu kicks off the discussion
  2. Mak_Tok proposes Rendang + Udang menu with quantities
  3. Tokey_Pasar flags that Udang Besar is very expensive
  4. Bendahari audits the cost → GAGAL (over budget)
  5. Mak_Tok proposes cheaper alternative (Ayam Masak Merah?)
  6. Tokey_Pasar recalculates
  7. Bendahari approves → LULUS
  8. Abang_Lorry plans the timeline
  9. Tok_Penghulu wraps up with SELESAI

Run from the backend/ directory:
  cd backend
  PYTHONUTF8=1 python test_group_chat.py
"""

import asyncio
import sys
import os

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

from app.agents.group_chat import create_team, run_team_stream

# ── ANSI colours for each agent ──────────────────────────────────────────────
RESET = "\033[0m"
BOLD = "\033[1m"

AGENT_STYLES = {
    "Tok_Penghulu": ("\033[34m", "👴🏽 TOK PENGHULU"),      # Blue
    "Mak_Tok":      ("\033[33m", "👵🏽 MAK TOK"),            # Yellow
    "Tokey_Pasar":  ("\033[32m", "🛒 TOKEY PASAR"),          # Green
    "Bendahari":    ("\033[31m", "📊 BENDAHARI"),             # Red
    "Abang_Lorry":  ("\033[37m", "🚛 ABANG LORRY"),          # Light grey
}


def print_agent_message(agent_name: str, content: str, msg_index: int) -> None:
    colour, label = AGENT_STYLES.get(
        agent_name, ("\033[35m", f"🤖 {agent_name}")
    )
    divider = "─" * 70
    print(f"\n{colour}{BOLD}{divider}{RESET}")
    print(f"{colour}{BOLD}[{msg_index}] {label}{RESET}")
    print(f"{colour}{divider}{RESET}")
    print(content)


# ── Stress Test Scenario ─────────────────────────────────────────────────────
STRESS_TEST_TASK = """
Saya nak buat majlis perkahwinan untuk 300 orang.

Menu yang saya nak:
- Rendang Daging (menu utama)
- Sambal Udang Galah Besar (lauk tambahan — ini pilihan saya, tolong usahakan)
- Nasi Putih

Bajet KESELURUHAN (bahan + operasi + semua kos) hanya RM4,500 SAHAJA.
Tarikh majlis: 15 Mei 2026 di Shah Alam, Selangor.
Majlis bermula jam 1:00 petang.

Tolong buat perancangan lengkap. Bendahari kena audit kos dan pastikan dalam bajet.
Abang Lorry kena buat jadual penyediaan sekali.
"""


async def main():
    print("\033[35m" + "=" * 70 + RESET)
    print(f"\033[35m{BOLD}🍛 KenduriLuhh — STRESS TEST: The Battle of Kenduri 🍛{RESET}")
    print("\033[35m" + "=" * 70 + RESET)
    print(f"\n📋 Senario: {STRESS_TEST_TASK.strip()}")
    print("\n\033[35m" + "=" * 70 + RESET)
    print(f"\033[35m{BOLD}Memulakan 5-Agent Group Chat... (Mode: Katering){RESET}")
    print("\033[35m" + "=" * 70 + RESET)

    team = create_team(mode="katering")
    msg_index = 0

    async for agent_name, content in run_team_stream(team, STRESS_TEST_TASK):
        if agent_name == "__DONE__":
            print(f"\n\033[35m{'=' * 70}{RESET}")
            print(f"\033[35m{BOLD}✅ {content}{RESET}")
            print(f"\033[35m{'=' * 70}{RESET}\n")
        else:
            msg_index += 1
            print_agent_message(agent_name, content, msg_index)

    print(f"\n\033[32m{BOLD}🎉 Stress test selesai! Semua ejen telah berunding.{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())
