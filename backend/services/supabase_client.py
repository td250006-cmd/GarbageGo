import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def supabase_config():
    url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        return None
    return url, key


def supabase_insert(table, payload):
    config = supabase_config()
    if not config:
        return {"saved": False, "reason": "Supabase unavailable. Keys are not configured."}
    url, key = config
    try:
        response = httpx.post(
            f"{url}/rest/v1/{table}",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json=payload,
            timeout=10,
        )
        if response.status_code >= 400:
            return {"saved": False, "reason": f"Supabase unavailable: {response.text}"}
        data = response.json()
        return {"saved": True, "data": data}
    except httpx.HTTPError as exc:
        return {"saved": False, "reason": f"Supabase unavailable: {exc}"}


def supabase_update(table, match_column, match_value, payload):
    config = supabase_config()
    if not config:
        return {"saved": False, "reason": "Supabase unavailable. Keys are not configured."}
    url, key = config
    try:
        response = httpx.patch(
            f"{url}/rest/v1/{table}?{match_column}=eq.{match_value}",
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
