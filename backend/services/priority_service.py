from datetime import datetime, timezone

from services.supabase_client import supabase_insert

HOTSPOT_MAP = {"High": 100, "Medium": 60, "Low": 30, "Normal": 30}


def _clamp(value, low=0, high=100):
    return max(low, min(high, value))


def calculate_priority(bin_fill_level, overflow_history, last_collection_interval, prediction):
    if prediction not in HOTSPOT_MAP:
        raise ValueError("Invalid bin data. prediction must be Low, Medium, or High.")
    fill = _clamp(float(bin_fill_level))
    overflow = _clamp((float(overflow_history) / 10) * 100)
    interval = _clamp((float(last_collection_interval) / 14) * 100)
    hotspot = HOTSPOT_MAP[prediction]
    score = round(fill * 0.40 + hotspot * 0.30 + overflow * 0.15 + interval * 0.15, 2)
    if score >= 90:
        status = "Critical"
    elif score >= 70:
        status = "High"
    elif score >= 40:
        status = "Medium"
    else:
        status = "Normal"
    return {
        "priority_score": score,
        "priority_status": status,
        "prediction": prediction,
    }


def save_priority(bin_id, result):
    payload = {
        "bin_id": bin_id,
        "priority_score": result["priority_score"],
        "priority_status": result["priority_status"],
        "prediction": result["prediction"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return supabase_insert("priority_scores", payload)


def save_prediction(bin_id, prediction, confidence, model_name="Random Forest"):
    payload = {
        "bin_id": bin_id,
        "prediction": prediction,
        "confidence": confidence,
        "model_name": model_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return supabase_insert("predictions", payload)


def save_route(route):
    payload = {
        "truck_id": route["truck_id"],
        "total_distance": route["total_distance"],
        "estimated_time": route["estimated_time"],
        "total_bins": route["total_bins"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    inserted = supabase_insert("routes", payload)
    if not inserted.get("saved"):
        return inserted
    rows = inserted.get("data") or []
    route_id = rows[0]["id"] if rows else None
    if route_id:
        for stop in route.get("ordered_bins", []):
            supabase_insert(
                "route_bins",
                {
                    "route_id": route_id,
                    "bin_id": stop["bin_id"],
                    "sequence": stop["sequence"],
                    "collected": False,
                },
            )
    return {"saved": True, "route_id": route_id}
