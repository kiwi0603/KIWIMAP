import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
PLACES_DIR = DATA_DIR / "places"


def slugify(value: str) -> str:
    value = value.strip()
    value = re.sub(r"[^0-9A-Za-z가-힣]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "place"


def parse_bool(value: str) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"y", "yes", "true", "1"}


def parse_list(value: str, sep: str) -> list:
    if not value:
        return []
    return [v.strip() for v in value.split(sep) if v.strip()]


def parse_menus(value: str) -> list:
    menus = []
    for item in parse_list(value, ";"):
        parts = [p.strip() for p in item.split("|")]
        name = parts[0] if len(parts) > 0 else ""
        price = parts[1] if len(parts) > 1 else ""
        recommend = parse_bool(parts[2]) if len(parts) > 2 else False
        if name:
            menus.append({"name": name, "price": price, "is_recommend": recommend})
    return menus


def parse_photos(value: str) -> list:
    photos = []
    for item in parse_list(value, ";"):
        photos.append({"url": item, "alt": ""})
    return photos


def main():
    if len(sys.argv) < 2:
        print("Usage: python csv_to_places.py <csv_path>")
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}")
        sys.exit(1)

    PLACES_DIR.mkdir(parents=True, exist_ok=True)

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            name = (row.get("name") or "").strip()
            address = (row.get("address") or "").strip()
            slug = slugify(name) or f"place-{idx}"
            file_name = f"{slug}-{idx}.json"

            place = {
                "id": f"{slug}-{idx}",
                "name": name,
                "address": address,
                "lat": None,
                "lng": None,
                "category": (row.get("category") or "").strip(),
                "intro": (row.get("intro") or "").strip(),
                "rating": float(row.get("rating") or 0),
                "menus": parse_menus(row.get("menus") or ""),
                "hours": {
                    "mon": row.get("mon") or "",
                    "tue": row.get("tue") or "",
                    "wed": row.get("wed") or "",
                    "thu": row.get("thu") or "",
                    "fri": row.get("fri") or "",
                    "sat": row.get("sat") or "",
                    "sun": row.get("sun") or "",
                },
                "holiday": parse_list(row.get("holiday") or "", "|"),
                "temp_closed": parse_bool(row.get("temp_closed") or ""),
                "phone": (row.get("phone") or "").strip(),
                "naver_place": (row.get("naver_place") or "").strip(),
                "photos": parse_photos(row.get("photos") or ""),
                "tags": parse_list(row.get("tags") or "", ";"),
            }

            with (PLACES_DIR / file_name).open("w", encoding="utf-8") as out:
                json.dump(place, out, ensure_ascii=False, indent=2)
                out.write("\n")


if __name__ == "__main__":
    main()
