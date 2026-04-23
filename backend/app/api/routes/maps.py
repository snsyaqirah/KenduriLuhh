"""
maps.py — Azure Maps proxy endpoints.

Keeps AZURE_MAPS_KEY server-side. Frontend never sees the key.

GET /api/maps/config           → returns client_id (safe to expose)
GET /api/maps/route?origin=...&destination=...  → drive time + distance
GET /api/maps/geocode?query=... → lat/lng for a place name
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from app.config import settings

router = APIRouter(prefix="/maps")

AZURE_MAPS_BASE = "https://atlas.microsoft.com"

# Hardcoded Pasar Borong locations — used as default supply origins
PASAR_BORONG_COORDS = {
    "Selayang":    {"lat": 3.2461, "lng": 101.6286, "name": "Pasar Borong Selayang"},
    "Pudu":        {"lat": 3.1418, "lng": 101.7120, "name": "Pasar Borong Pudu Raya"},
    "Penang":      {"lat": 5.4020, "lng": 100.3250, "name": "Pasar Borong Penang"},
    "JB":          {"lat": 1.4655, "lng": 103.7578, "name": "Pasar Borong JB"},
    "Kota Bharu":  {"lat": 6.1248, "lng": 102.2381, "name": "Pasar Borong Kota Bharu"},
}


def _nearest_pasar(destination_lat: float, destination_lng: float) -> dict:
    """Return the closest Pasar Borong to the destination coordinates."""
    import math
    best = None
    best_dist = float("inf")
    for pb in PASAR_BORONG_COORDS.values():
        d = math.sqrt((pb["lat"] - destination_lat) ** 2 + (pb["lng"] - destination_lng) ** 2)
        if d < best_dist:
            best_dist = d
            best = pb
    return best or PASAR_BORONG_COORDS["Selayang"]


@router.get("/config")
async def get_maps_config():
    """Return public Azure Maps configuration (client ID only — key stays server-side)."""
    return {
        "client_id": settings.AZURE_MAPS_CLIENT_ID,
        "enabled": bool(settings.AZURE_MAPS_KEY),
    }


@router.get("/geocode")
async def geocode(query: str = Query(..., min_length=2)):
    """Geocode a place name → {lat, lng, address}."""
    if not settings.AZURE_MAPS_KEY:
        raise HTTPException(status_code=503, detail="Azure Maps key not configured")

    url = f"{AZURE_MAPS_BASE}/search/address/json"
    params = {
        "api-version": "1.0",
        "subscription-key": settings.AZURE_MAPS_KEY,
        "query": query,
        "countrySet": "MY",
        "limit": 1,
        "language": "ms-MY",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Azure Maps geocode failed")

    data = resp.json()
    results = data.get("results", [])
    if not results:
        raise HTTPException(status_code=404, detail=f"Location not found: {query}")

    r = results[0]
    pos = r["position"]
    return {
        "lat": pos["lat"],
        "lng": pos["lon"],
        "address": r.get("address", {}).get("freeformAddress", query),
    }


WEATHER_CODE_MAP = {
    0: ("☀️", "Cerah", "Clear sky"),
    1: ("🌤️", "Cerah sebahagian", "Mainly clear"),
    2: ("⛅", "Berawan", "Partly cloudy"),
    3: ("☁️", "Mendung", "Overcast"),
    45: ("🌫️", "Kabus", "Foggy"),
    48: ("🌫️", "Kabus ais", "Icy fog"),
    51: ("🌦️", "Renyai ringan", "Light drizzle"),
    53: ("🌦️", "Renyai", "Drizzle"),
    55: ("🌦️", "Renyai lebat", "Heavy drizzle"),
    61: ("🌧️", "Hujan ringan", "Light rain"),
    63: ("🌧️", "Hujan", "Rain"),
    65: ("🌧️", "Hujan lebat", "Heavy rain"),
    80: ("🌧️", "Hujan renyai", "Rain showers"),
    81: ("🌧️", "Hujan lebat", "Heavy showers"),
    82: ("⛈️", "Hujan ribut", "Violent showers"),
    95: ("⛈️", "Ribut petir", "Thunderstorm"),
    96: ("⛈️", "Ribut dengan hujan batu", "Thunderstorm + hail"),
    99: ("⛈️", "Ribut teruk", "Severe thunderstorm"),
}


async def _get_weather(lat: float, lng: float) -> dict | None:
    """Fetch current weather from Open-Meteo (no API key needed)."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,precipitation,weathercode,windspeed_10m"
            f"&timezone=Asia%2FKuala_Lumpur"
        )
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            return None
        data = resp.json().get("current", {})
        code = data.get("weathercode", 0)
        desc = WEATHER_CODE_MAP.get(code, WEATHER_CODE_MAP.get(0))
        return {
            "icon": desc[0],
            "label_ms": desc[1],
            "label_en": desc[2],
            "temperature_c": round(data.get("temperature_2m", 0), 1),
            "precipitation_mm": round(data.get("precipitation", 0), 1),
            "windspeed_kmh": round(data.get("windspeed_10m", 0), 1),
            "code": code,
        }
    except Exception:
        return None


@router.get("/route")
async def get_route(
    destination: str = Query(..., description="Event location string (city/address)"),
):
    """
    Calculate driving route from nearest Pasar Borong to event destination.
    Origin is always the hardcoded nearest Pasar Borong — no geocoding ambiguity.
    Also returns current weather at the destination via Open-Meteo.
    """
    if not settings.AZURE_MAPS_KEY:
        raise HTTPException(status_code=503, detail="Azure Maps key not configured")

    # Geocode destination only
    async with httpx.AsyncClient(timeout=15) as client:
        geocode_url = f"{AZURE_MAPS_BASE}/search/address/json"
        dest_resp = await client.get(geocode_url, params={
            "api-version": "1.0",
            "subscription-key": settings.AZURE_MAPS_KEY,
            "countrySet": "MY",
            "limit": 1,
            "query": destination + ", Malaysia",
        })

    if dest_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Geocoding failed")

    dest_results = dest_resp.json().get("results", [])
    if not dest_results:
        raise HTTPException(status_code=404, detail=f"Location not found: {destination}")

    d_pos = dest_results[0]["position"]
    d_addr = dest_results[0].get("address", {}).get("freeformAddress", destination)

    # Find nearest Pasar Borong using hardcoded coordinates (no geocoding ambiguity)
    nearest_pb = _nearest_pasar(d_pos["lat"], d_pos["lon"])
    o_pos = {"lat": nearest_pb["lat"], "lon": nearest_pb["lng"]}
    o_addr = nearest_pb["name"]

    # Routing + weather in parallel
    route_url = (
        f"{AZURE_MAPS_BASE}/route/directions/json"
        f"?api-version=1.0"
        f"&subscription-key={settings.AZURE_MAPS_KEY}"
        f"&query={o_pos['lat']},{o_pos['lon']}:{d_pos['lat']},{d_pos['lon']}"
        f"&travelMode=car"
        f"&routeType=fastest"
        f"&traffic=true"
    )

    import asyncio
    route_task   = asyncio.create_task(_fetch_route(route_url))
    weather_task = asyncio.create_task(_get_weather(d_pos["lat"], d_pos["lon"]))
    route_resp_data, weather = await asyncio.gather(route_task, weather_task)

    if route_resp_data is None:
        raise HTTPException(status_code=502, detail="Azure Maps routing failed")

    routes = route_resp_data.get("routes", [])
    if not routes:
        raise HTTPException(status_code=404, detail="No route found")

    summary   = routes[0]["summary"]
    distance_m = summary["lengthInMeters"]
    duration_s = summary["travelTimeInSeconds"]
    traffic_s  = summary.get("trafficDelayInSeconds", 0)

    return {
        "origin": {
            "address": o_addr,
            "lat": o_pos["lat"],
            "lng": o_pos["lon"],
        },
        "destination": {
            "address": d_addr,
            "lat": d_pos["lat"],
            "lng": d_pos["lon"],
        },
        "nearest_pasar_borong": nearest_pb,
        "route": {
            "distance_km": round(distance_m / 1000, 1),
            "duration_min": round(duration_s / 60),
            "traffic_delay_min": round(traffic_s / 60),
            "summary": f"{round(distance_m / 1000, 1)} km · {round(duration_s / 60)} min drive",
        },
        "weather": weather,
        "maps_url": f"https://www.bing.com/maps?rtp=adr.{o_addr}~adr.{d_addr}",
    }


async def _fetch_route(url: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
        return resp.json() if resp.status_code == 200 else None
    except Exception:
        return None
