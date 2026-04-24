"""
rag_service.py — Lightweight Retrieval-Augmented Generation for KenduriLuhh.

Chunks all 5 KB JSON files into retrievable documents, scores them against a
user query using TF-IDF term overlap, and returns the top-k most relevant
chunks to inject into agent context.

No external ML dependencies — uses Python stdlib math only.
"""

import json
import math
import re
from functools import lru_cache
from pathlib import Path

KB_DIR = Path(__file__).parent.parent / "knowledge_base"


# ── Tokenisation ──────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [t for t in text.split() if len(t) > 1]


# ── Chunk builders — one chunk per KB entity ──────────────────────────────────

def _chunk_menus() -> list[dict]:
    with open(KB_DIR / "menus.json", encoding="utf-8") as f:
        menus = json.load(f)["menus"]
    chunks = []
    for m in menus:
        text = (
            f"Hidangan: {m['name']} ({m.get('name_en', '')}) | "
            f"Kategori: {m['category']} | "
            f"Sesuai untuk: {', '.join(m.get('suitable_for', []))} | "
            f"Status halal: {m.get('halal_status', 'halal')} | "
            f"Kos katering: RM{m.get('katering_unit_cost_myr', 0):.2f}/pax | "
            f"Masa prep: {m.get('prep_time_hours', 0)} jam | "
            f"Masa masak: {m.get('cook_time_hours', 0)} jam | "
            f"Ukuran rewang: {m.get('rewang_measurement', '-')} | "
            f"Bahan utama: {', '.join(m.get('main_ingredients', []))} | "
            f"Nota: {m.get('notes', '')}"
        )
        chunks.append({"id": m["id"], "source": "menus.json", "text": text})
    return chunks


def _chunk_ingredients() -> list[dict]:
    with open(KB_DIR / "ingredients.json", encoding="utf-8") as f:
        ingredients = json.load(f)["ingredients"]
    chunks = []
    for i in ingredients:
        subs = ", ".join(i.get("substitutes", []))
        stock = i.get("stock_status", "available")
        lead = i.get("lead_time_days")
        stock_note = (
            f"⚠️ STOK RENDAH (hubungi pembekal {lead} hari awal)" if stock == "low_stock" and lead
            else f"⚠️ PERLU ORDER {lead} HARI AWAL" if stock == "order_required" and lead
            else "Tersedia"
        )
        text = (
            f"Bahan: {i['name_ms']} ({i.get('name_en', '')}) | "
            f"Kategori: {i.get('category', '')} | "
            f"Harga Pasar Borong: RM{i['pasar_borong_price_myr']:.2f}/{i['unit']} | "
            f"Harga runcit: RM{i.get('retail_price_myr', 0):.2f}/{i['unit']} | "
            f"Status stok: {stock_note} | "
            f"Halal: {i.get('halal_certified', True)} | "
            f"Gantikan dengan: {subs or '-'} | "
            f"Ukuran rewang: {i.get('rewang_measure', '-')} | "
            f"Nota: {i.get('notes', '')}"
        )
        chunks.append({"id": i["id"], "source": "ingredients.json", "text": text})
    return chunks


def _chunk_suppliers() -> list[dict]:
    with open(KB_DIR / "suppliers.json", encoding="utf-8") as f:
        suppliers = json.load(f)["suppliers"]
    chunks = []
    for s in suppliers:
        specialties = ", ".join(s.get("specialties", s.get("products", [])))
        best_for = ", ".join(s.get("best_for", []))
        text = (
            f"Pembekal: {s['name']} | "
            f"Jenis: {s.get('type', '')} | "
            f"Lokasi: {s.get('location', '')} | "
            f"Jarak dari KL: {s.get('distance_from_kl_km', '?')} km | "
            f"Kepakaran: {specialties} | "
            f"Terbaik untuk: {best_for} | "
            f"Waktu operasi: {s.get('operating_hours', '-')} | "
            f"Halal: {s.get('halal_certified', True)} | "
            f"Nota: {s.get('notes', '')}"
        )
        chunks.append({"id": s["id"], "source": "suppliers.json", "text": text})
    return chunks


def _chunk_rempah() -> list[dict]:
    with open(KB_DIR / "rempah_ratus.json", encoding="utf-8") as f:
        data = json.load(f)
    chunks = []
    for r in data.get("rempah_blends", []):
        components = r.get("components", [])
        if components and isinstance(components[0], dict):
            comp_str = ", ".join(c.get("ingredient", str(c)) for c in components)
        else:
            comp_str = ", ".join(str(c) for c in components)
        used_in = ", ".join(r.get("used_in", []))
        text = (
            f"Rempah: {r['name']} ({r.get('name_en', '')}) | "
            f"Digunakan dalam: {used_in} | "
            f"Bahan: {comp_str} | "
            f"Kuantiti: {r.get('quantity_per_kg_meat_gram', '')} g per kg daging | "
            f"Ganti segera: {r.get('instant_substitute', '-')} | "
            f"Nota: {r.get('notes', '')}"
        )
        chunks.append({"id": r["id"], "source": "rempah_ratus.json", "text": text})
    return chunks


def _chunk_halal() -> list[dict]:
    with open(KB_DIR / "halal_checklist.json", encoding="utf-8") as f:
        data = json.load(f)
    chunks = []
    for j, rule in enumerate(data.get("rules", [])):
        triggers = ", ".join(rule.get("check_ingredients", []))
        text = (
            f"Peraturan Halal: periksa [{triggers}] | "
            f"Tahap: {rule.get('severity', '')} | "
            f"Nota: {rule.get('note', rule.get('notes', ''))}"
        )
        chunks.append({"id": f"halal-rule-{j}", "source": "halal_checklist.json", "text": text})
    return chunks


# ── Index build (cached at startup) ──────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_all_chunks() -> list[dict]:
    """Load and chunk all 5 KB files. Cached for the lifetime of the process."""
    chunks = []
    for builder in [_chunk_menus, _chunk_ingredients, _chunk_suppliers, _chunk_rempah, _chunk_halal]:
        try:
            chunks.extend(builder())
        except Exception:
            pass
    # Pre-tokenize and attach terms
    for c in chunks:
        c["terms"] = _tokenize(c["text"])
    return chunks


@lru_cache(maxsize=1)
def _get_idf() -> dict[str, float]:
    """Inverse document frequency across all chunks."""
    chunks = _get_all_chunks()
    N = len(chunks)
    df: dict[str, int] = {}
    for chunk in chunks:
        for term in set(chunk["terms"]):
            df[term] = df.get(term, 0) + 1
    return {term: math.log(N / (count + 1)) + 1 for term, count in df.items()}


# ── Public API ────────────────────────────────────────────────────────────────

def retrieve(query: str, top_k: int = 8) -> list[dict]:
    """
    Retrieve the top-k most relevant KB chunks for a query.

    Scoring: TF-IDF term overlap — chunks whose terms overlap most with the
    query terms score highest. Favours specificity over length.

    Returns list of {source, id, text, score}.
    """
    chunks = _get_all_chunks()
    idf = _get_idf()
    query_terms = set(_tokenize(query))

    scored: list[tuple[float, dict]] = []
    for chunk in chunks:
        term_freq: dict[str, int] = {}
        for t in chunk["terms"]:
            term_freq[t] = term_freq.get(t, 0) + 1

        score = 0.0
        for term in query_terms:
            if term in term_freq:
                tf = term_freq[term] / max(len(chunk["terms"]), 1)
                score += tf * idf.get(term, 1.0)

        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "source": c["source"],
            "id": c["id"],
            "text": c["text"],
            "score": round(s, 4),
        }
        for s, c in scored[:top_k]
    ]


def format_rag_context(chunks: list[dict], language: str = "ms") -> str:
    """Format retrieved chunks into a context block for agent prompt injection."""
    if not chunks:
        return ""

    if language == "en":
        header = "📚 RETRIEVED KNOWLEDGE BASE CONTEXT (RAG — top relevant entries):"
        footer = "Use the above KB entries as your primary factual reference. Cite the source file when you use a fact."
    else:
        header = "📚 KONTEKS PANGKALAN PENGETAHUAN (RAG — entri paling relevan):"
        footer = "Gunakan entri KB di atas sebagai rujukan fakta utama anda. Nyatakan sumber fail apabila menggunakan fakta."

    lines = [header, ""]
    for i, chunk in enumerate(chunks, 1):
        snippet = chunk["text"][:280] + ("…" if len(chunk["text"]) > 280 else "")
        lines.append(f"[{i}] 📁 {chunk['source']} | {snippet}")
    lines.append("")
    lines.append(footer)
    return "\n".join(lines)


def get_rag_context_for_request(data: dict) -> str:
    """
    Build a RAG query from a CateringRequest dict and return the formatted
    context block ready to append to the agent task string.
    """
    context, _, _ = get_rag_context_with_meta(data)
    return context


def get_rag_context_with_meta(data: dict) -> tuple[str, int, list[str]]:
    """
    Like get_rag_context_for_request but also returns chunk count and source files.
    Returns (formatted_context, chunk_count, unique_sources_list).
    """
    language = data.get("language", "ms")
    query_parts = [
        data.get("event_type", ""),
        str(data.get("pax", "")),
        data.get("event_location", ""),
        " ".join(data.get("menu_preferences", [])),
        data.get("dietary_notes", ""),
        data.get("mode", "katering"),
    ]
    query = " ".join(p for p in query_parts if p).strip()
    chunks = retrieve(query, top_k=8)
    context = format_rag_context(chunks, language)
    # Deduplicate sources while preserving order
    seen: set[str] = set()
    sources: list[str] = []
    for c in chunks:
        s = c["source"]
        if s not in seen:
            seen.add(s)
            sources.append(s)
    return context, len(chunks), sources
