"""
session_service.py — in-memory session store for agent chat sessions.

Each session tracks:
  - status: pending | running | done | error
  - messages: list of {agent, content} dicts (grows during streaming)
  - final_result: the last message marked as SELESAI (or None)
  - created_at: datetime for TTL enforcement

For the hackathon this is sufficient. Production would use Redis.
"""

import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

from app.config import settings

_sessions: dict[str, dict] = {}


def create_session(mode: str) -> str:
    """Create a new session and return its ID."""
    session_id = str(uuid4())
    _sessions[session_id] = {
        "id": session_id,
        "mode": mode,
        "status": "pending",
        "messages": [],
        "final_result": None,
        "error": None,
        "request_payload": None,
        "created_at": datetime.utcnow(),
    }
    return session_id


def store_request(session_id: str, request_data: dict) -> None:
    """Store the serialized CateringRequest for later use by the SSE stream."""
    if session_id in _sessions:
        _sessions[session_id]["request_payload"] = request_data


def get_session(session_id: str) -> dict | None:
    session = _sessions.get(session_id)
    if session is None:
        return None
    # Enforce TTL
    ttl = timedelta(seconds=settings.SESSION_TTL_SECONDS)
    if datetime.utcnow() - session["created_at"] > ttl:
        del _sessions[session_id]
        return None
    return session


def set_running(session_id: str) -> None:
    if session_id in _sessions:
        _sessions[session_id]["status"] = "running"


def add_message(session_id: str, agent_name: str, content: str) -> None:
    if session_id in _sessions:
        _sessions[session_id]["messages"].append({
            "agent": agent_name,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        })


def set_done(session_id: str) -> None:
    if session_id in _sessions:
        _sessions[session_id]["status"] = "done"
        # The final result is the last non-system message
        messages = _sessions[session_id]["messages"]
        agent_msgs = [m for m in messages if m["agent"] not in ("user", "__DONE__")]
        if agent_msgs:
            _sessions[session_id]["final_result"] = agent_msgs[-1]


def set_error(session_id: str, error: str) -> None:
    if session_id in _sessions:
        _sessions[session_id]["status"] = "error"
        _sessions[session_id]["error"] = error


def cleanup_expired() -> int:
    """Remove expired sessions. Returns count of removed sessions."""
    ttl = timedelta(seconds=settings.SESSION_TTL_SECONDS)
    now = datetime.utcnow()
    expired = [
        sid for sid, s in _sessions.items()
        if now - s["created_at"] > ttl
    ]
    for sid in expired:
        del _sessions[sid]
    return len(expired)
