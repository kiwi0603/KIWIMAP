import json
import os
import time
from pathlib import Path
from typing import Optional

import requests

ROOT = Path(__file__).resolve().parents[1]
PLACES_DIR = ROOT / "data" / "places"
OUTPUT = ROOT / "data" / "places.json"

API_URL = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"


def get_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing env: {name}")
    return value


def geocode_address(address: str, client_id: str, client_secret: str) -> Optional[tuple]:
    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
    }
    params = {"query": address}
    res = requests.get(API_URL, headers=headers, params=params, timeout=10)
    if res.status_code != 200:
        raise RuntimeError(f"Geocode failed ({res.status_code}): {res.text[:200]}")

    payload = res.json()
    addresses = payload.get("addresses") or []
    if not addresses:
        return None

    first = addresses[0]
    x = first.get("x")
    y = first.get("y")
    if not x or not y:
        return None

    return float(y), float(x)


def load_place(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_place(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def needs_geocode(place: dict) -> bool:
    return not place.get("lat") or not place.get("lng")


def main() -> None:
    client_id = get_env("NAVER_MAPS_CLIENT_ID")
    client_secret = get_env("NAVER_MAPS_CLIENT_SECRET")

    if not PLACES_DIR.exists():
        print(f"No places dir: {PLACES_DIR}")
        return

    updated = 0
    for path in sorted(PLACES_DIR.glob("*.json")):
        place = load_place(path)
        if not needs_geocode(place):
            continue

        address = (place.get("address") or "").strip()
        if not address:
            print(f"Skip (no address): {path.name}")
            continue

        try:
            result = geocode_address(address, client_id, client_secret)
        except Exception as exc:
            print(f"Fail: {path.name} - {exc}")
            continue

        if not result:
            print(f"No result: {path.name}")
            continue

        lat, lng = result
        place["lat"] = lat
        place["lng"] = lng
        save_place(path, place)
        updated += 1
        time.sleep(0.2)

    print(f"Updated: {updated}")

    items = []
    for path in sorted(PLACES_DIR.glob("*.json")):
        items.append(load_place(path))

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
