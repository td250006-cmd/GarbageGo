import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
import httpx

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

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
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return {"saved": False, "reason": "Supabase unavailable. Priority calculated locally."}
    payload = {
        "bin_id": bin_id,
        "priority_score": result["priority_score"],
        "priority_status": result["priority_status"],
        "prediction": result["prediction"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        response = httpx.post(
            f"{url}/rest/v1/priority_scores",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=payload,
            timeout=10,
        )
        if response.status_code >= 400:
            return {"saved": False, "reason": f"Supabase unavailable: {response.text}"}
        return {"saved": True}
    except httpx.HTTPError as exc:
        return {"saved": False, "reason": f"Supabase unavailable: {exc}"}
