"""
request_models.py — Pydantic input validation for all API endpoints.
"""

import re
from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

_INJECTION_RE = re.compile(
    r"(ignore previous|system:|<\|im_start\|>|assistant:|forget all|you are now)",
    re.IGNORECASE,
)


def _clean(value: str) -> str:
    """Strip prompt injection attempts from any string field."""
    return _INJECTION_RE.sub("[removed]", value).strip()


class CateringRequest(BaseModel):
    mode: Literal["katering", "rewang"]
    event_type: str = Field(
        default="wedding",
        description="Type of event: wedding, aqiqah, birthday, corporate, kenduri",
        max_length=50,
    )
    pax: int = Field(ge=10, le=5000, description="Number of guests (10-5000)")
    budget_myr: float = Field(gt=0, description="Total budget in Malaysian Ringgit")
    event_date: date = Field(description="Date of the event (must be today or future)")
    event_location: str = Field(max_length=100, description="City or address of event")
    menu_preferences: list[str] = Field(
        default=[],
        max_length=10,
        description="List of preferred dishes or cuisine types",
    )
    dietary_notes: str = Field(default="", max_length=300, description="Dietary requirements")
    special_requests: str = Field(default="", max_length=500, description="Any special notes")
    # Katering mode only
    profit_margin_percent: float | None = Field(
        default=None, ge=0, le=100, description="Desired profit margin (Katering mode)"
    )
    # Rewang mode only
    coordinator_name: str | None = Field(
        default=None, max_length=50, description="Name of rewang coordinator"
    )

    @field_validator("event_date")
    @classmethod
    def date_must_be_future(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Event date must be today or in the future")
        return v

    @field_validator("event_type", "event_location", "dietary_notes", "special_requests", mode="before")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        return _clean(str(v)) if isinstance(v, str) else v

    @field_validator("menu_preferences", mode="before")
    @classmethod
    def sanitize_list(cls, v: list) -> list:
        return [_clean(str(item)) for item in v] if isinstance(v, list) else v
