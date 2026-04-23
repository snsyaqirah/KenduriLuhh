"""
chat.py — Agent chat endpoints.

POST /api/chat/start           → Store request, return session_id immediately
GET  /api/chat/{id}/stream     → SSE: live agent messages as they arrive
GET  /api/chat/{id}/result     → Poll for full result (pending / running / done / error)
"""

import json
import re
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.models.request_models import CateringRequest
from app.models.response_models import ChatStartResponse, ChatResultResponse, AgentMessage
from app.services import session_service
from app.services.knowledge_service import build_task_string
from app.services.weather_service import get_event_weather
from app.agents.group_chat import create_team, run_team_stream
from app.config import settings

router = APIRouter(prefix="/chat")


def _classify_action(agent: str, content: str) -> dict:
    """
    Classify what an agent did and extract key outputs for the audit trail.
    This is the JSON signature Dharun mentioned — makes agent decisions traceable.
    """
    c = content.lower()

    if agent == "Tok_Penghulu":
        if "selesai" in c:
            return {"action": "SESSION_CLOSE", "status": "SUCCESS"}
        return {"action": "SESSION_OPEN", "status": "SUCCESS"}

    if agent == "Mak_Tok":
        is_revision = any(w in c for w in [
            "revisi", "alter", "tukar", "kurang", "pinda", "revised", "cheaper", "alternative", "ekonomi", "economy"
        ])
        action = "MENU_REVISION" if is_revision else "MENU_PROPOSAL"
        items = re.findall(r"(?m)^\s*\d+\.\s+\*?\*?([A-Za-z][^*\n(]+)", content)
        dishes = [i.strip().split("(")[0].strip() for i in items[:5] if len(i.strip()) > 2]
        return {"action": action, "key_outputs": {"dishes": dishes}, "status": "SUCCESS"}

    if agent == "Tokey_Pasar":
        rm = re.search(
            r"(?:JUMLAH KOS BAHAN|TOTAL INGREDIENT COST)[:\s]+RM\s?([\d,]+)",
            content, re.IGNORECASE
        )
        mahal = len(re.findall(r"⚠️\s*(?:MAHAL|EXPENSIVE)", content))
        substitutes = len(re.findall(r"→", content))
        return {
            "action": "PRICE_REPORT",
            "key_outputs": {
                "total_ingredient_cost_myr": rm.group(1) if rm else None,
                "expensive_flags": mahal,
                "substitutes_suggested": substitutes,
            },
            "status": "SUCCESS",
        }

    if agent == "Bendahari":
        rejected = bool(re.search(r"\bGAGAL\b|\bFAILED\b|over bajet|over budget", content, re.IGNORECASE))
        quotation = re.search(r"(?:SEBUT HARGA|QUOTATION)[:\s]+RM\s?([\d,]+)", content, re.IGNORECASE)
        variance = re.search(r"over\s+(?:bajet|budget)\s+RM\s?([\d,]+)", content, re.IGNORECASE)
        waste = re.search(r"(?:waste reduction|pengurangan pembaziran)[:\s]+(\d+(?:\.\d+)?)\s*%", content, re.IGNORECASE)
        margin = re.search(r"margin[^%\n]*?(\d+(?:\.\d+)?)\s*%", content, re.IGNORECASE)
        per_head = re.search(r"(?:per kepala|per head|per pax)[:\s]+RM\s?([\d,]+(?:\.\d+)?)", content, re.IGNORECASE)
        return {
            "action": "BUDGET_AUDIT",
            "key_outputs": {
                "quotation_myr": quotation.group(1) if quotation else None,
                "variance_myr": variance.group(1) if variance else None,
                "waste_reduction_pct": waste.group(1) if waste else None,
                "margin_pct": margin.group(1) if margin else None,
                "per_head_myr": per_head.group(1) if per_head else None,
            },
            "status": "REJECTED" if rejected else "APPROVED",
        }

    if agent == "Abang_Lorry":
        t_steps = len(re.findall(r"\bT-\d+\b", content))
        weather_flag = bool(re.search(r"(?:monsun|banjir|flood|hujan|rain|weather|cuaca)", content, re.IGNORECASE))
        return {
            "action": "LOGISTICS_PLAN",
            "key_outputs": {"timeline_steps": t_steps, "weather_risk_flagged": weather_flag},
            "status": "SUCCESS",
        }

    return {"action": "SPEAK", "status": "SUCCESS"}


@router.post("/start", response_model=ChatStartResponse, status_code=202)
async def start_chat(request: CateringRequest):
    """
    Create a catering planning session.
    Returns session_id immediately — agents do NOT run yet.
    Open GET /api/chat/{session_id}/stream to start and watch live.
    """
    session_id = session_service.create_session(request.mode, request.language)
    session_service.store_request(session_id, request.model_dump(mode="json"))
    return ChatStartResponse(
        session_id=session_id,
        mode=request.mode,
        message=f"Session created. Connect to /api/chat/{session_id}/stream to start.",
    )


@router.get("/{session_id}/stream")
async def stream_chat(session_id: str):
    """
    SSE endpoint — runs the 5-agent team and streams each message as an event.

    SSE event shapes:
      {"type": "agent_message", "agent": "<name>", "content": "<text>",
       "timestamp": "<iso>", "audit": {"action": "...", "status": "...", "key_outputs": {...}}}
      {"type": "done",  "total_messages": <int>}
      {"type": "error", "message": "<text>"}

    Reconnect behaviour:
      - pending  → starts agents fresh
      - running  → 409 (already in flight)
      - done     → replays stored messages
      - error    → replays error event
    """
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    status = session["status"]

    if status == "running":
        raise HTTPException(status_code=409, detail="Session is already streaming")

    if status == "done":
        async def _replay():
            for msg in session["messages"]:
                yield {"data": json.dumps({
                    "type": "agent_message",
                    "agent": msg["agent"],
                    "content": msg["content"],
                    "timestamp": msg["timestamp"],
                    "audit": msg.get("audit"),
                })}
            yield {"data": json.dumps({"type": "done", "total_messages": len(session["messages"])})}
        return EventSourceResponse(_replay())

    if status == "error":
        async def _err():
            yield {"data": json.dumps({"type": "error", "message": session.get("error", "Unknown error")})}
        return EventSourceResponse(_err())

    request_data = session.get("request_payload")
    if not request_data:
        raise HTTPException(status_code=400, detail="No request payload stored for this session")

    async def _live_stream():
        session_service.set_running(session_id)
        try:
            language = session.get("language", "ms")
            weather_data = await get_event_weather(
                location=request_data.get("event_location", ""),
                event_date_str=request_data.get("event_date", ""),
                language=language,
                tomorrow_api_key=settings.TOMORROW_API_KEY,
                weatherapi_key=settings.WEATHERAPI_KEY,
                redahluhh_api_url=settings.REDAHLUHH_API_URL,
            )
            team = create_team(mode=session["mode"], language=language, weather_data=weather_data)
            task_text = build_task_string(request_data)

            async for agent_name, content in run_team_stream(team, task_text):
                if agent_name == "__DONE__":
                    session_service.set_done(session_id)
                    done_session = session_service.get_session(session_id)
                    total = len(done_session["messages"]) if done_session else 0
                    yield {"data": json.dumps({"type": "done", "total_messages": total})}
                    return

                ts = datetime.utcnow().isoformat()
                audit = _classify_action(agent_name, content)
                session_service.add_message(session_id, agent_name, content, audit)
                yield {"data": json.dumps({
                    "type": "agent_message",
                    "agent": agent_name,
                    "content": content,
                    "timestamp": ts,
                    "audit": audit,
                })}

        except Exception as exc:
            session_service.set_error(session_id, str(exc))
            yield {"data": json.dumps({"type": "error", "message": str(exc)})}

    return EventSourceResponse(_live_stream())


@router.get("/{session_id}/result", response_model=ChatResultResponse)
async def get_result(session_id: str):
    """Poll for the result of a chat session."""
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    messages = [AgentMessage(**m) for m in session["messages"]]
    final = AgentMessage(**session["final_result"]) if session["final_result"] else None

    return ChatResultResponse(
        session_id=session_id,
        mode=session["mode"],
        status=session["status"],
        messages=messages,
        final_result=final,
        error=session.get("error"),
        total_messages=len(messages),
    )
