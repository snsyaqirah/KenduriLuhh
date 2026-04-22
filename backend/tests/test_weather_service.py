"""
Tests for weather_service.py — uses httpx mocking via respx or monkeypatching.
Run: cd backend && pytest tests/ -v
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from app.services.weather_service import (
    _seasonal_estimate,
    _risk_level,
    _format_weather_block,
    get_event_weather,
)


class TestSeasonalEstimate:
    def test_december_is_high_risk(self):
        result = _seasonal_estimate(12, "Kuala Terengganu")
        assert result["risk"] == "HIGH" or result["precip_prob"] >= 60

    def test_july_is_low_risk(self):
        result = _seasonal_estimate(7, "Kuala Lumpur")
        assert result["precip_prob"] <= 30

    def test_shah_alam_flood_zone(self):
        result = _seasonal_estimate(1, "Shah Alam")
        assert result["flood_zone"] is True

    def test_unknown_location_no_flood(self):
        result = _seasonal_estimate(6, "Ipoh")
        assert result["flood_zone"] is False

    def test_always_returns_required_keys(self):
        result = _seasonal_estimate(3, "Johor Bahru")
        for key in ("temp_min", "temp_max", "temp_avg", "precip_prob", "wind_kmh", "conditions"):
            assert key in result


class TestRiskLevel:
    def test_high_precip_is_red(self):
        label, _ = _risk_level(80, False)
        assert "HIGH" in label or "🔴" in label

    def test_met_warning_forces_red(self):
        label, _ = _risk_level(20, True)
        assert "HIGH" in label or "🔴" in label

    def test_medium_precip_is_yellow(self):
        label, _ = _risk_level(50, False)
        assert "MEDIUM" in label or "🟡" in label

    def test_low_precip_is_green(self):
        label, _ = _risk_level(15, False)
        assert "LOW" in label or "🟢" in label


class TestFormatWeatherBlock:
    def _base_wd(self) -> dict:
        return {
            "source": "test", "temp_min": 25, "temp_max": 33, "temp_avg": 29,
            "precip_prob": 60, "wind_kmh": 12, "conditions": "Partly cloudy",
            "flood_zone": False,
        }

    def test_ms_block_contains_location(self):
        block = _format_weather_block(self._base_wd(), "2026-07-01", "Shah Alam", [], "ms")
        assert "Shah Alam" in block

    def test_en_block_in_english(self):
        block = _format_weather_block(self._base_wd(), "2026-07-01", "Shah Alam", [], "en")
        assert "Temperature" in block or "Rain probability" in block

    def test_ms_block_in_malay(self):
        block = _format_weather_block(self._base_wd(), "2026-07-01", "Shah Alam", [], "ms")
        assert "Suhu" in block or "hujan" in block.lower()

    def test_met_warnings_appear_in_block(self):
        warnings = ["⚠️ MET WARNING: Flash flood — Selangor"]
        block = _format_weather_block(self._base_wd(), "2026-07-01", "Shah Alam", warnings, "en")
        assert "Flash flood" in block

    def test_flood_zone_note_shown(self):
        wd = self._base_wd()
        wd["flood_zone"] = True
        block = _format_weather_block(wd, "2026-07-01", "Shah Alam", [], "en")
        assert "flood" in block.lower()


@pytest.mark.asyncio
class TestGetEventWeather:
    async def test_empty_location_returns_empty(self):
        result = await get_event_weather("", "2026-07-01")
        assert result == ""

    async def test_empty_date_returns_empty(self):
        result = await get_event_weather("Kuala Lumpur", "")
        assert result == ""

    async def test_returns_string_with_valid_inputs(self):
        result = await get_event_weather("Kuala Lumpur", "2026-07-01")
        assert isinstance(result, str)
        assert len(result) > 0

    async def test_seasonal_fallback_for_far_future(self):
        # 2030 is beyond any forecast window — should use seasonal estimate
        result = await get_event_weather(
            "Kuala Lumpur", "2030-12-25",
            redahluhh_api_url="",  # disable RedahLuhh for unit test
        )
        assert isinstance(result, str) and len(result) > 0

    async def test_never_raises_on_bad_date_format(self):
        result = await get_event_weather("Kuala Lumpur", "not-a-date")
        assert result == ""

    async def test_redahluhh_url_empty_falls_through(self):
        # With no RedahLuhh URL and no API keys, should still return seasonal block
        result = await get_event_weather(
            "Shah Alam", "2026-08-01",
            redahluhh_api_url="",
            tomorrow_api_key="",
        )
        assert isinstance(result, str) and len(result) > 0

    async def test_block_mentions_location(self):
        result = await get_event_weather(
            "Johor Bahru", "2026-07-01",
            redahluhh_api_url="",
        )
        assert "Johor Bahru" in result
