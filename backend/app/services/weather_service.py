"""
weather_service.py — Fetches weather forecast for an event location/date.

Provider cascade (most to least powerful):
  1. RedahLuhh API  — https://redahluhh.onrender.com (full routing intelligence +
                       MET Malaysia warnings + Tomorrow.io → Open-Meteo cascade)
  2. Tomorrow.io    — direct call if RedahLuhh unavailable (TOMORROW_API_KEY)
  3. Open-Meteo     — free, no key, ECMWF model
  4. Seasonal fallback — month-based risk estimate (always succeeds)

RedahLuhh Note: Render free tier may have a ~30s cold-start delay.
We use a 12s timeout and fall through immediately on failure.
"""

import logging
from datetime import date, datetime

import httpx

logger = logging.getLogger(__name__)

# ── Tomorrow.io weather code → human label ─────────────────────────────────
_TOMORROW_CODES: dict[int, str] = {
    1000: "Clear", 1100: "Mostly clear", 1101: "Partly cloudy",
    1102: "Mostly cloudy", 2000: "Fog", 2100: "Light fog",
    4000: "Drizzle", 4001: "Rain", 4200: "Light rain", 4201: "Heavy rain",
    5000: "Snow", 8000: "Thunderstorm",
}

# ── Malaysia seasonal risk by month ────────────────────────────────────────
_SEASONAL_RISK: dict[int, dict] = {
    1:  {"risk": "HIGH",   "note": "Northeast Monsoon — East Coast flood risk (Kelantan, Pahang, Terengganu)"},
    2:  {"risk": "HIGH",   "note": "Northeast Monsoon ending — lingering flood risk in East Coast"},
    3:  {"risk": "MEDIUM", "note": "Inter-monsoon — afternoon thunderstorms likely in peninsular Malaysia"},
    4:  {"risk": "MEDIUM", "note": "Inter-monsoon — afternoon thunderstorms (3–6PM) common in KL/Selangor"},
    5:  {"risk": "MEDIUM", "note": "Southwest Monsoon beginning — Sabah/Sarawak flood risk rising"},
    6:  {"risk": "LOW",    "note": "Southwest Monsoon — drier on West Coast; Sabah/Sarawak wetter"},
    7:  {"risk": "LOW",    "note": "Southwest Monsoon — driest months for West Coast peninsular"},
    8:  {"risk": "LOW",    "note": "Southwest Monsoon — stable weather for West Coast events"},
    9:  {"risk": "MEDIUM", "note": "Inter-monsoon — afternoon storms resuming, especially KL/Selangor"},
    10: {"risk": "MEDIUM", "note": "Inter-monsoon — heavy afternoon rain common; highest lightning risk"},
    11: {"risk": "HIGH",   "note": "Northeast Monsoon beginning — East Coast flooding season starts"},
    12: {"risk": "HIGH",   "note": "Peak Northeast Monsoon — East Coast floods; avoid outdoor events"},
}

_FLOOD_ZONES = [
    "shah alam", "klang", "subang", "kota tinggi", "kuantan",
    "kota bharu", "kuala terengganu", "muar", "batu pahat",
]


def _seasonal_estimate(event_month: int, location: str) -> dict:
    info = _SEASONAL_RISK.get(event_month, {"risk": "MEDIUM", "note": "Seasonal data unavailable"})
    flood_zone = any(z in location.lower() for z in _FLOOD_ZONES)
    return {
        "source": "seasonal",
        "temp_min": 26, "temp_max": 34, "temp_avg": 30,
        "precip_prob": 70 if info["risk"] == "HIGH" else 40 if info["risk"] == "MEDIUM" else 20,
        "wind_kmh": 15,
        "conditions": f"{info['risk']} season risk — {info['note']}",
        "flood_zone": flood_zone,
        "met_warnings": [],
        "alerts": [],
    }


# ── Provider 1: RedahLuhh deployed API ─────────────────────────────────────

async def _fetch_redahluhh(location: str, event_date_str: str, api_url: str) -> dict | None:
    """
    Call the deployed RedahLuhh weather intelligence API.
    Uses same origin=destination to get point weather (not route).
    RedahLuhh cascades Tomorrow.io → Open-Meteo → WeatherAPI internally.
    Also returns MET Malaysia warnings.
    """
    if not api_url:
        return None
    try:
        # Combine event date with 08:00 local time for departure_time
        departure_iso = f"{event_date_str}T08:00:00"
        payload = {
            "origin": location,
            "destination": location,
            "departure_time": departure_iso,
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.post(f"{api_url.rstrip('/')}/api/route-weather", json=payload)
            r.raise_for_status()
            data = r.json()

        routes = data.get("routes", [])
        if not routes:
            return None

        route = routes[0]
        waypoints = route.get("waypoints", [])
        wx = waypoints[0].get("weather", {}) if waypoints else {}

        if not wx:
            return None

        precip_raw = wx.get("precipitation_prob", 0.3)
        precip_pct = round(precip_raw * 100) if precip_raw <= 1.0 else int(precip_raw)
        wind_ms = wx.get("wind_speed", 3.0)

        return {
            "source": "RedahLuhh (redahluhh.onrender.com)",
            "temp_min": round(wx.get("temperature", 29) - 3, 1),
            "temp_max": round(wx.get("temperature", 29) + 3, 1),
            "temp_avg": round(wx.get("temperature", 29), 1),
            "precip_prob": precip_pct,
            "wind_kmh": round(wind_ms * 3.6, 1),
            "conditions": wx.get("description", wx.get("label", "Data from RedahLuhh")),
            "status": wx.get("status", "green"),
            "icon": wx.get("icon_code", "🌤️"),
            "flood_zone": any(z in location.lower() for z in _FLOOD_ZONES),
            "met_warnings": route.get("met_warnings", []),
            "alerts": route.get("alerts", []),
            "overall_label": route.get("overall_label", ""),
        }
    except Exception as exc:
        logger.debug("RedahLuhh API failed (%s): %s", api_url, exc)
        return None


# ── Provider 2: Tomorrow.io direct ─────────────────────────────────────────

async def _fetch_tomorrow(location: str, event_date_str: str, api_key: str) -> dict | None:
    if not api_key:
        return None
    url = "https://api.tomorrow.io/v4/weather/forecast"
    params = {"location": location, "apikey": api_key, "timesteps": "1d", "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            daily = r.json().get("timelines", {}).get("daily", [])
            for entry in daily:
                if entry.get("time", "").startswith(event_date_str):
                    v = entry["values"]
                    code = int(v.get("weatherCodeMax", 1000))
                    return {
                        "source": "Tomorrow.io",
                        "temp_min": round(v.get("temperatureMin", 26), 1),
                        "temp_max": round(v.get("temperatureMax", 34), 1),
                        "temp_avg": round(v.get("temperatureAvg", 30), 1),
                        "precip_prob": round(v.get("precipitationProbabilityAvg", 30)),
                        "wind_kmh": round(v.get("windSpeedAvg", 10) * 3.6, 1),
                        "conditions": _TOMORROW_CODES.get(code, f"Code {code}"),
                        "flood_zone": any(z in location.lower() for z in _FLOOD_ZONES),
                        "met_warnings": [], "alerts": [],
                    }
        return None
    except Exception as exc:
        logger.debug("Tomorrow.io failed: %s", exc)
        return None


# ── Provider 3: Open-Meteo ─────────────────────────────────────────────────

async def _fetch_openmeteo(location: str, event_date_str: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            geo = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": location, "count": 1, "language": "en"},
            )
            geo.raise_for_status()
            results = geo.json().get("results", [])
            if not results:
                return None
            lat, lng = results[0]["latitude"], results[0]["longitude"]

            wx = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat, "longitude": lng,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
                    "timezone": "Asia/Kuala_Lumpur",
                    "start_date": event_date_str,
                    "end_date": event_date_str,
                },
            )
            wx.raise_for_status()
            d = wx.json().get("daily", {})
            tmax_list = d.get("temperature_2m_max", [None])
            tmin_list = d.get("temperature_2m_min", [None])
            precip_list = d.get("precipitation_probability_max", [None])
            wind_list = d.get("wind_speed_10m_max", [None])

            if not tmax_list or tmax_list[0] is None:
                return None
            tmax = tmax_list[0]
            tmin = tmin_list[0] if tmin_list and tmin_list[0] is not None else tmax - 6
            return {
                "source": "Open-Meteo (ECMWF)",
                "temp_min": round(tmin, 1),
                "temp_max": round(tmax, 1),
                "temp_avg": round((tmax + tmin) / 2, 1),
                "precip_prob": int(precip_list[0]) if precip_list and precip_list[0] is not None else 40,
                "wind_kmh": round(wind_list[0], 1) if wind_list and wind_list[0] else 15.0,
                "conditions": "Forecast data (ECMWF model)",
                "flood_zone": any(z in location.lower() for z in _FLOOD_ZONES),
                "met_warnings": [], "alerts": [],
            }
    except Exception as exc:
        logger.debug("Open-Meteo failed: %s", exc)
        return None


# ── Risk assessment ────────────────────────────────────────────────────────

def _risk_level(precip_prob: int, has_warnings: bool, status: str = "") -> tuple[str, str]:
    if has_warnings or status == "red" or precip_prob >= 75:
        return "🔴 HIGH", "Significant rain risk. Confirm indoor/canopy backup. Delay outdoor setup if raining."
    if status == "yellow" or precip_prob >= 40:
        return "🟡 MEDIUM", "Moderate rain risk. Arrange standby canopy. Prefer morning setup and delivery."
    return "🟢 LOW", "Favourable weather. Standard logistics apply."


# ── Format output block ────────────────────────────────────────────────────

def _format_weather_block(wd: dict, event_date: str, location: str, language: str) -> str:
    met_warnings = wd.get("met_warnings", [])
    alerts = wd.get("alerts", [])
    status = wd.get("status", "")
    overall_label = wd.get("overall_label", "")
    risk_label, risk_advice = _risk_level(wd["precip_prob"], bool(met_warnings), status)

    all_warnings = met_warnings + alerts
    flood_note = wd.get("flood_zone", False)

    if language == "en":
        block = (
            f"\n\n=== LIVE WEATHER INTELLIGENCE — powered by {wd['source']} ===\n"
            f"Event location  : {location}\n"
            f"Event date      : {event_date}\n"
            f"Temperature     : {wd['temp_min']}°C – {wd['temp_max']}°C (avg {wd['temp_avg']}°C)\n"
            f"Rain probability: {wd['precip_prob']}%\n"
            f"Wind speed      : {wd['wind_kmh']} km/h\n"
            f"Conditions      : {wd.get('icon', '')} {wd['conditions']}\n"
        )
        if overall_label:
            block += f"Overall status  : {overall_label}\n"
        block += f"Risk level      : {risk_label}\n"
        if flood_note:
            block += "⚠️ FLOOD ZONE — monitor drainage and access roads closely.\n"
        if all_warnings:
            block += "\n".join(f"  • {w}" for w in all_warnings[:4]) + "\n"
        block += f"\nLOGISTICS IMPLICATION: {risk_advice}\n=== END WEATHER DATA ===\n"
    else:
        block = (
            f"\n\n=== DATA CUACA LANGSUNG — dikuasakan oleh {wd['source']} ===\n"
            f"Lokasi majlis   : {location}\n"
            f"Tarikh majlis   : {event_date}\n"
            f"Suhu            : {wd['temp_min']}°C – {wd['temp_max']}°C (purata {wd['temp_avg']}°C)\n"
            f"Kebarangkalian hujan: {wd['precip_prob']}%\n"
            f"Kelajuan angin  : {wd['wind_kmh']} km/h\n"
            f"Keadaan         : {wd.get('icon', '')} {wd['conditions']}\n"
        )
        if overall_label:
            block += f"Status keseluruhan: {overall_label}\n"
        block += f"Tahap risiko    : {risk_label}\n"
        if flood_note:
            block += "⚠️ KAWASAN BANJIR — pantau saliran dan jalan masuk.\n"
        if all_warnings:
            block += "\n".join(f"  • {w}" for w in all_warnings[:4]) + "\n"
        block += f"\nIMPLIKASI LOGISTIK: {risk_advice}\n=== AKHIR DATA CUACA ===\n"

    return block


# ── Public API ─────────────────────────────────────────────────────────────

async def get_event_weather(
    location: str,
    event_date_str: str,
    language: str = "ms",
    tomorrow_api_key: str = "",
    weatherapi_key: str = "",
    redahluhh_api_url: str = "https://redahluhh.onrender.com",
) -> str:
    """
    Returns a formatted weather intelligence block for injection into Abang_Lorry's prompt.
    Cascade: RedahLuhh API → Tomorrow.io → Open-Meteo → seasonal estimate.
    Never raises — always returns a string.
    """
    if not location or not event_date_str:
        return ""

    try:
        event_date = date.fromisoformat(event_date_str)
    except ValueError:
        return ""

    days_until = (event_date - date.today()).days
    wd: dict | None = None

    # Provider 1: RedahLuhh deployed API (best — has routing intelligence + MET Malaysia)
    wd = await _fetch_redahluhh(location, event_date_str, redahluhh_api_url)

    # Provider 2: Tomorrow.io direct (if RedahLuhh unavailable and within forecast window)
    if wd is None and days_until <= 14 and days_until >= 0:
        wd = await _fetch_tomorrow(location, event_date_str, tomorrow_api_key)

    # Provider 3: Open-Meteo (free fallback, 16-day window)
    if wd is None and days_until <= 16 and days_until >= 0:
        wd = await _fetch_openmeteo(location, event_date_str)

    # Provider 4: Seasonal estimate (always available)
    if wd is None:
        wd = _seasonal_estimate(event_date.month, location)

    return _format_weather_block(wd, event_date_str, location, language)
