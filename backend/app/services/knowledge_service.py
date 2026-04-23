"""
knowledge_service.py — loads and queries the local JSON knowledge base.
All data lives in app/knowledge_base/*.json
"""

import json
import re
from pathlib import Path
from functools import lru_cache

KB_DIR = Path(__file__).parent.parent / "knowledge_base"

_PROMPT_INJECTION_PATTERNS = re.compile(
    r"(ignore previous|system:|<\|im_start\|>|<\|im_end\|>|assistant:|forget all|you are now)",
    re.IGNORECASE,
)


def sanitize_input(text: str) -> str:
    """Strip common prompt-injection attempts from user-supplied strings."""
    return _PROMPT_INJECTION_PATTERNS.sub("[REMOVED]", text).strip()


@lru_cache(maxsize=1)
def load_menus() -> list[dict]:
    with open(KB_DIR / "menus.json", encoding="utf-8") as f:
        return json.load(f)["menus"]


@lru_cache(maxsize=1)
def load_ingredients() -> list[dict]:
    with open(KB_DIR / "ingredients.json", encoding="utf-8") as f:
        return json.load(f)["ingredients"]


@lru_cache(maxsize=1)
def load_suppliers() -> list[dict]:
    with open(KB_DIR / "suppliers.json", encoding="utf-8") as f:
        return json.load(f)["suppliers"]


@lru_cache(maxsize=1)
def load_rempah() -> list[dict]:
    with open(KB_DIR / "rempah_ratus.json", encoding="utf-8") as f:
        return json.load(f)["rempah_blends"]


@lru_cache(maxsize=1)
def load_halal_rules() -> dict:
    with open(KB_DIR / "halal_checklist.json", encoding="utf-8") as f:
        return json.load(f)


# ── Query helpers injected into agent system prompts ──────────────────────────

def get_menus_for_event(event_type: str) -> list[dict]:
    """Return menus suitable for a given event type."""
    return [m for m in load_menus() if event_type.lower() in [s.lower() for s in m["suitable_for"]]]


def get_ingredient_price_table() -> str:
    """Return a compact markdown table of Pasar Borong prices for injection into Tokey_Pasar's prompt."""
    ingredients = load_ingredients()
    rows = [
        f"| {i['name_ms']} | RM{i['pasar_borong_price_myr']:.2f}/{i['unit']} | "
        f"{'⚠️ MAHAL' if i['pasar_borong_price_myr'] >= 25 else '✅'} |"
        for i in ingredients
    ]
    header = "| Bahan | Harga Pasar Borong | Status |\n|------|----|----|"
    return header + "\n" + "\n".join(rows)


def get_menu_excerpt_for_prompt(event_type: str | None = None, max_items: int = 8) -> str:
    """Return a compact JSON string of menu data for injection into Mak_Tok's prompt."""
    menus = get_menus_for_event(event_type) if event_type else load_menus()
    # Keep only fields useful for planning (drop internal notes)
    compact = [
        {
            "name": m["name"],
            "category": m["category"],
            "katering_cost_myr": m["katering_unit_cost_myr"],
            "prep_hours": m["prep_time_hours"],
            "cook_hours": m["cook_time_hours"],
            "rewang_measure": m.get("rewang_measurement", ""),
        }
        for m in menus[:max_items]
    ]
    return json.dumps(compact, ensure_ascii=False, indent=None)


def build_task_string(data: dict) -> str:
    """
    Convert a validated CateringRequest dict into a natural language task
    that the agent team can process. Sanitizes all user-supplied strings.
    The task language mirrors the user's language preference so all agents
    respond in the same language (they are instructed to mirror input language).
    """
    mode = data.get("mode", "katering")
    language = data.get("language", "ms")
    event_type = sanitize_input(data.get("event_type", "majlis"))
    pax = data.get("pax", 0)
    budget = data.get("budget_myr", 0)
    event_date = data.get("event_date", "")
    location = sanitize_input(data.get("event_location", ""))
    preferences = [sanitize_input(p) for p in data.get("menu_preferences", [])]
    dietary = sanitize_input(data.get("dietary_notes", ""))
    special = sanitize_input(data.get("special_requests", ""))
    profit = data.get("profit_margin_percent")
    coordinator = sanitize_input(data.get("coordinator_name", "") or "")

    if language == "en":
        prefs_str = ", ".join(preferences) if preferences else "no specific preference"
        profit_str = f"\nTarget profit margin: {profit}%" if profit else ""
        dietary_str = f"\nDietary requirements: {dietary}" if dietary else ""
        special_str = f"\nSpecial requests: {special}" if special else ""
        coord_str = f"\nRewang coordinator: {coordinator}" if coordinator else ""

        if mode == "katering":
            return (
                f"I am a professional caterer with the following booking:\n"
                f"- Event type: {event_type}\n"
                f"- Number of guests (pax): {pax}\n"
                f"- Client budget: RM{budget:,.2f}\n"
                f"- Event date: {event_date}\n"
                f"- Location: {location}\n"
                f"- Menu preferences: {prefs_str}"
                f"{profit_str}{dietary_str}{special_str}\n\n"
                f"Please create a full catering plan: menu recommendations, ingredient costs, budget audit, and logistics schedule."
            )
        else:
            return (
                f"We are organising a community self-catered event (rewang/gotong-royong):\n"
                f"- Event type: {event_type}\n"
                f"- Number of guests: {pax}\n"
                f"- Total budget: RM{budget:,.2f}\n"
                f"- Event date: {event_date}\n"
                f"- Location: {location}\n"
                f"- Suggested menu: {prefs_str}"
                f"{dietary_str}{special_str}{coord_str}\n\n"
                f"Please provide a shopping list in household measurements (gantang, cups) "
                f"and a cooking schedule for the community team."
            )
    else:
        prefs_str = ", ".join(preferences) if preferences else "tiada pilihan spesifik"
        profit_str = f"\nProfit margin yang dikehendaki: {profit}%" if profit else ""
        dietary_str = f"\nNote pemakanan: {dietary}" if dietary else ""
        special_str = f"\nPermintaan khas: {special}" if special else ""
        coord_str = f"\nPenyelaras rewang: {coordinator}" if coordinator else ""

        if mode == "katering":
            return (
                f"Saya adalah pengusaha katering yang menerima tempahan berikut:\n"
                f"- Jenis majlis: {event_type}\n"
                f"- Bilangan tetamu (pax): {pax} orang\n"
                f"- Bajet pelanggan: RM{budget:,.2f}\n"
                f"- Tarikh majlis: {event_date}\n"
                f"- Lokasi: {location}\n"
                f"- Pilihan menu: {prefs_str}"
                f"{profit_str}{dietary_str}{special_str}\n\n"
                f"Sila buat perancangan katering lengkap: menu, kos bahan, audit bajet, dan jadual logistik."
            )
        else:
            return (
                f"Kami nak buat kenduri sendiri (rewang/gotong-royong):\n"
                f"- Jenis majlis: {event_type}\n"
                f"- Bilangan tetamu: {pax} orang\n"
                f"- Bajet keseluruhan: RM{budget:,.2f}\n"
                f"- Tarikh: {event_date}\n"
                f"- Lokasi: {location}\n"
                f"- Menu yang dicadangkan: {prefs_str}"
                f"{dietary_str}{special_str}{coord_str}\n\n"
                f"Tolong bagi senarai beli-belah dalam unit metrik (kg, g, L, ml) "
                f"dan jadual untuk kami masak sendiri."
            )
