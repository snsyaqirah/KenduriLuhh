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


@router.get("/route")
async def get_route(
    destination: str = Query(..., description="Event location string (city/address)"),
    origin: str = Query("Pasar Borong Selayang, Selangor", description="Supply origin"),
):
    """
    Calculate driving route from supply origin to event destination.
    Returns: distance_km, duration_min, summary, and nearest pasar borong.
    """
    if not settings.AZURE_MAPS_KEY:
        raise HTTPException(status_code=503, detail="Azure Maps key not configured")

    # Geocode both endpoints
    async with httpx.AsyncClient(timeout=15) as client:
        geocode_url = f"{AZURE_MAPS_BASE}/search/address/json"
        common_params = {
            "api-version": "1.0",
            "subscription-key": settings.AZURE_MAPS_KEY,
            "countrySet": "MY",
            "limit": 1,
        }

        origin_resp = await client.get(geocode_url, params={**common_params, "query": origin})
        dest_resp   = await client.get(geocode_url, params={**common_params, "query": destination + ", Malaysia"})

        if origin_resp.status_code != 200 or dest_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Geocoding failed")

        origin_data = origin_resp.json()
        dest_data   = dest_resp.json()

    origin_results = origin_data.get("results", [])
    dest_results   = dest_data.get("results", [])

    if not origin_results or not dest_results:
        raise HTTPException(status_code=404, detail="Could not geocode one or both locations")

    o_pos = origin_results[0]["position"]
    d_pos = dest_results[0]["position"]
    o_addr = origin_results[0].get("address", {}).get("freeformAddress", origin)
    d_addr = dest_results[0].get("address", {}).get("freeformAddress", destination)

    # Find nearest Pasar Borong to destination
    nearest_pb = _nearest_pasar(d_pos["lat"], d_pos["lon"])

    # Routing call
    route_url = (
        f"{AZURE_MAPS_BASE}/route/directions/json"
        f"?api-version=1.0"
        f"&subscription-key={settings.AZURE_MAPS_KEY}"
        f"&query={o_pos['lat']},{o_pos['lon']}:{d_pos['lat']},{d_pos['lon']}"
        f"&travelMode=car"
        f"&routeType=fastest"
        f"&traffic=true"
    )

    async with httpx.AsyncClient(timeout=15) as client:
        route_resp = await client.get(route_url)

    if route_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Azure Maps routing failed")

    route_data = route_resp.json()
    routes = route_data.get("routes", [])
    if not routes:
        raise HTTPException(status_code=404, detail="No route found")

    summary = routes[0]["summary"]
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
        "maps_url": (
            f"https://www.bing.com/maps?rtp=adr.{o_addr}~adr.{d_addr}"
        ),
    }
