import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLACES_DIR = ROOT / "data" / "places"
OUTPUT = ROOT / "data" / "places.json"


def main():
    items = []
    for path in sorted(PLACES_DIR.glob("*.json")):
        with path.open("r", encoding="utf-8") as f:
            items.append(json.load(f))

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
