"""
test_sse.py — Day 4 SSE streaming test.

Run the server first:
    cd backend
    PYTHONUTF8=1 uvicorn app.main:app --reload --port 8000

Then in another terminal:
    cd backend
    PYTHONUTF8=1 python test_sse.py
"""

import sys
import json
import httpx

sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:8000/api"

AGENT_COLORS = {
    "Tok_Penghulu": "\033[95m",   # magenta
    "Mak_Tok":      "\033[93m",   # yellow
    "Tokey_Pasar":  "\033[96m",   # cyan
    "Bendahari":    "\033[92m",   # green
    "Abang_Lorry":  "\033[94m",   # blue
}
RESET = "\033[0m"
BOLD  = "\033[1m"


def color(agent: str, text: str) -> str:
    c = AGENT_COLORS.get(agent, "\033[97m")
    return f"{c}{BOLD}[{agent}]{RESET}{c} {text}{RESET}"


def main():
    # ── Step 1: POST /chat/start ──────────────────────────────────────────────
    payload = {
        "mode": "katering",
        "event_type": "wedding",
        "pax": 200,
        "budget_myr": 4500.0,
        "event_date": "2026-06-15",
        "event_location": "Dewan Serbaguna Ampang, Selangor",
        "menu_preferences": ["nasi minyak", "rendang daging"],
        "dietary_notes": "Semua halal, tiada seafood untuk tetamu alahan",
        "profit_margin_percent": 20.0,
    }

    print(f"\n{BOLD}=== KenduriLuhh SSE Day 4 Test ==={RESET}")
    print(f"Sending POST /api/chat/start ...")

    with httpx.Client(timeout=10) as client:
        r = client.post(f"{BASE}/chat/start", json=payload)
        r.raise_for_status()
        data = r.json()

    session_id = data["session_id"]
    print(f"  ✓ Session ID : {session_id}")
    print(f"  ✓ Mode       : {data['mode']}")
    print(f"\nConnecting to SSE stream ...\n")
    print("─" * 70)

    # ── Step 2: GET /chat/{id}/stream — consume SSE events ───────────────────
    msg_count = 0
    with httpx.Client(timeout=600) as client:
        with client.stream("GET", f"{BASE}/chat/{session_id}/stream") as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                line = line.strip()
                if not line.startswith("data:"):
                    continue
                raw = line[len("data:"):].strip()
                if not raw:
                    continue
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    print(f"  [?] Non-JSON SSE data: {raw}")
                    continue

                etype = event.get("type")

                if etype == "agent_message":
                    msg_count += 1
                    agent = event.get("agent", "?")
                    content = event.get("content", "")
                    print(f"\n{color(agent, content)}\n")

                elif etype == "done":
                    print("─" * 70)
                    print(f"\n{BOLD}✓ SELESAI — {event.get('total_messages', msg_count)} mesej diterima{RESET}")
                    break

                elif etype == "error":
                    print(f"\n\033[91m[ERROR] {event.get('message')}{RESET}")
                    break

    # ── Step 3: GET /chat/{id}/result ─────────────────────────────────────────
    print(f"\nFetching final result from /api/chat/{session_id}/result ...")
    with httpx.Client(timeout=10) as client:
        r = client.get(f"{BASE}/chat/{session_id}/result")
        r.raise_for_status()
        result = r.json()

    print(f"  Status        : {result['status']}")
    print(f"  Total messages: {result['total_messages']}")
    if result.get("final_result"):
        fr = result["final_result"]
        print(f"  Final agent   : {fr['agent']}")
        print(f"  Final content : {fr['content'][:200]}...")


if __name__ == "__main__":
    main()
