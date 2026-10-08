import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from services.priority_service import calculate_priority

router = APIRouter()

ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "ml" / "urban_waste_hotspot_dataset.csv"

# In-memory storage for active session updates
_bins_cache: List[dict] = []
_collections_cache: List[dict] = []
_bin_history_cache: List[dict] = []


def _get_zone(lat: float, lon: float) -> str:
    lat_mid = 11.075
    lon_mid = 76.975
    ns = "North" if lat >= lat_mid else "South"
    ew = "East" if lon >= lon_mid else "West"
    return f"{ns}-{ew} Sector"


def _load_initial_bins():
    global _bins_cache, _bin_history_cache, _collections_cache
    if _bins_cache:
        return _bins_cache

    if not CSV_PATH.exists():
        return []

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [next(reader) for _ in range(100)]

    loaded = []
    for idx, r in enumerate(rows, start=1):
        raw_hotspot = r["waste_hotspot_level"]
        hotspot = "Low" if raw_hotspot == "Normal" else raw_hotspot
        fill = float(r["bin_fill_level"])
        overflow = float(r["overflow_history"])
        interval = float(r["last_collection_interval"])

        p_info = calculate_priority(fill, overflow, interval, hotspot)
        lat = float(r["latitude"])
        lon = float(r["longitude"])

        bin_obj = {
            "id": idx,
            "bin_id": r["bin_id"],
            "latitude": lat,
            "longitude": lon,
            "bin_fill_level": round(fill, 1),
            "historical_fill_average": round(float(r["historical_fill_average"]), 1),
            "last_collection_interval": round(interval, 1),
            "overflow_history": round(overflow, 1),
            "collection_frequency": round(float(r["collection_frequency"]), 1),
            "missed_collection_count": round(float(r["missed_collection_count"]), 1),
            "hour_of_day": int(r["hour_of_day"]),
            "day_of_week": int(r["day_of_week"]),
            "month": int(r["month"]),
            "weekend_flag": int(r["weekend_flag"]),
            "holiday_flag": int(r["holiday_flag"]),
            "land_use_type": r["land_use_type"],
            "traffic_density": round(float(r["traffic_density"]), 1),
            "average_vehicle_speed": round(float(r["average_vehicle_speed"]), 1),
            "road_congestion_index": round(float(r["road_congestion_index"]), 2),
            "travel_time_to_bin": round(float(r["travel_time_to_bin"]), 1),
            "road_closure_flag": int(r["road_closure_flag"]),
            "waste_hotspot_level": hotspot,
            "priority_score": p_info["priority_score"],
            "status": p_info["priority_status"],
            "zone": _get_zone(lat, lon),
            "collected": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        loaded.append(bin_obj)

        # Generate some realistic initial history for chart displays
        _bin_history_cache.extend([
            {
                "id": len(_bin_history_cache) + 1,
                "bin_id": r["bin_id"],
                "bin_fill_level": round(max(0, fill - 25), 1),
                "recorded_at": "2026-10-06T08:00:00Z",
            },
            {
                "id": len(_bin_history_cache) + 2,
                "bin_id": r["bin_id"],
                "bin_fill_level": round(max(0, fill - 10), 1),
                "recorded_at": "2026-10-07T08:00:00Z",
            },
            {
                "id": len(_bin_history_cache) + 3,
                "bin_id": r["bin_id"],
                "bin_fill_level": round(fill, 1),
                "recorded_at": "2026-10-08T08:00:00Z",
            },
        ])

    _bins_cache = loaded

    # Initialize a few initial collections for dashboard
    normal_bins = [b for b in _bins_cache if b["status"] == "Normal"][:4]
    for i, nb in enumerate(normal_bins, start=1):
        _collections_cache.append({
            "id": i,
            "bin_id": nb["bin_id"],
            "truck_id": "TRK-01" if i % 2 == 1 else "TRK-02",
            "collected_at": f"2026-10-08T0{7 + i}:15:00Z",
            "fill_level_at_collection": nb["bin_fill_level"],
            "status": "Collected",
        })

    return _bins_cache


@router.get("/bins")
def get_bins():
    return _load_initial_bins()


@router.get("/bins/{bin_id}")
def get_bin(bin_id: str):
    bins = _load_initial_bins()
    for b in bins:
        if b["bin_id"] == bin_id:
            return b
    raise HTTPException(status_code=404, detail=f"Bin {bin_id} not found.")


@router.get("/trucks")
def get_trucks():
    return [
        {
            "truck_id": "TRK-01",
            "driver_name": "Amit Patil",
            "capacity_kg": 2500,
            "status": "Available",
            "assigned_route_id": None,
        },
        {
            "truck_id": "TRK-02",
            "driver_name": "Sneha Kulkarni",
            "capacity_kg": 2200,
            "status": "Available",
            "assigned_route_id": None,
        },
        {
            "truck_id": "TRK-03",
            "driver_name": "Rahul Deshmukh",
            "capacity_kg": 1800,
            "status": "Available",
            "assigned_route_id": None,
        },
    ]


@router.get("/collections")
def get_collections():
    _load_initial_bins()
    return _collections_cache


class CollectionPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    bin_id: str
    truck_id: Optional[str] = "TRK-01"


@router.post("/collections")
def create_collection(payload: CollectionPayload):
    bins = _load_initial_bins()
    matched = None
    for b in bins:
        if b["bin_id"] == payload.bin_id:
            matched = b
            break

    if not matched:
        raise HTTPException(status_code=404, detail=f"Bin {payload.bin_id} not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": len(_collections_cache) + 1,
        "bin_id": payload.bin_id,
        "truck_id": payload.truck_id or "TRK-01",
        "collected_at": now_iso,
        "fill_level_at_collection": matched["bin_fill_level"],
        "status": "Collected",
    }
    _collections_cache.insert(0, record)

    # Reset bin fill level to approximately 8% as per requirements
    matched["bin_fill_level"] = 8.0
    matched["last_collection_interval"] = 0.0
    matched["collected"] = True
    matched["status"] = "Normal"
    # Recalculate priority
    p_info = calculate_priority(8.0, matched["overflow_history"], 0.0, matched["waste_hotspot_level"])
    matched["priority_score"] = p_info["priority_score"]
    matched["updated_at"] = now_iso

    # Append to bin history
    _bin_history_cache.append({
        "id": len(_bin_history_cache) + 1,
        "bin_id": payload.bin_id,
        "bin_fill_level": 8.0,
        "recorded_at": now_iso,
    })

    return {"collection": record, "bin": matched}


@router.get("/bin-history/{bin_id}")
def get_bin_history(bin_id: str):
    _load_initial_bins()
    history = [h for h in _bin_history_cache if h["bin_id"] == bin_id]
    return history
