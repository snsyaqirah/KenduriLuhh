"""
chat.py — Agent chat endpoints.

POST /api/chat/start           → Store request, return session_id immediately
GET  /api/chat/{id}/stream     → SSE: live agent messages as they arrive
GET  /api/chat/{id}/result     → Poll for full result (pending / running / done / error)
"""

import json
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
      {"type": "agent_message", "agent": "<name>", "content": "<text>", "timestamp": "<iso>"}
      {"type": "done",          "total_messages": <int>}
      {"type": "error",         "message": "<text>"}

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

    # Already running — reject double-connect
    if status == "running":
        raise HTTPException(status_code=409, detail="Session is already streaming")

    # Done — replay stored messages so frontend can reconnect
    if status == "done":
        async def _replay():
            for msg in session["messages"]:
                yield {"data": json.dumps({
                    "type": "agent_message",
                    "agent": msg["agent"],
                    "content": msg["content"],
                    "timestamp": msg["timestamp"],
                })}
            yield {"data": json.dumps({"type": "done", "total_messages": len(session["messages"])})}
        return EventSourceResponse(_replay())

    # Error — replay error event
    if status == "error":
        async def _err():
            yield {"data": json.dumps({"type": "error", "message": session.get("error", "Unknown error")})}
        return EventSourceResponse(_err())

    # Pending — start agents and stream live
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
                session_service.add_message(session_id, agent_name, content)
                yield {"data": json.dumps({
                    "type": "agent_message",
                    "agent": agent_name,
                    "content": content,
                    "timestamp": ts,
                })}

        except Exception as exc:
            session_service.set_error(session_id, str(exc))
            yield {"data": json.dumps({"type": "error", "message": str(exc)})}

    return EventSourceResponse(_live_stream())


@router.get("/{session_id}/result", response_model=ChatResultResponse)
async def get_result(session_id: str):
    """
    Poll for the result of a chat session.
    Status values: pending | running | done | error
    """
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
