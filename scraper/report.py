"""
UniGate raw data report.

Prints a quick summary of the scraped raw files in data/raw so we can see
which universities succeeded, were manually supplied, or were blocked.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
RAW_DATA_DIR = (PROJECT_ROOT / "data" / "raw").resolve()


def load_raw_file(path: Path) -> dict[str, Any]:
    """Load a raw scrape JSON file."""
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> int:
    """Print a formatted table of all raw data files."""
    rows: list[tuple[str, str, int]] = []
    summary = {
        "Total": 0,
        "Success": 0,
        "Manual": 0,
        "Blocked/Invalid": 0,
        "Failed": 0,
    }

    if not RAW_DATA_DIR.exists():
        print(f"Raw data directory not found: {RAW_DATA_DIR}")
        return 1

    for raw_file in sorted(RAW_DATA_DIR.glob("*.json")):
        if raw_file.name == ".gitkeep":
            continue

        payload = load_raw_file(raw_file)
        university_id = str(payload.get("university_id") or raw_file.stem)
        status = str(payload.get("scrape_status") or "unknown")
        raw_text = payload.get("raw_text")
        text_length = len(raw_text) if isinstance(raw_text, str) else 0

        rows.append((university_id, status, text_length))
        summary["Total"] += 1
        if status == "success":
            summary["Success"] += 1
        elif status == "manual":
            summary["Manual"] += 1
        elif status == "blocked_or_invalid":
            summary["Blocked/Invalid"] += 1
        elif status == "failed":
            summary["Failed"] += 1

    if not rows:
        print("No raw JSON files found.")
        return 0

    id_width = max(len("University ID"), *(len(row[0]) for row in rows))
    status_width = max(len("Status"), *(len(row[1]) for row in rows))
    length_width = len("Text Length")

    header = f"{'University ID':<{id_width}} | {'Status':<{status_width}} | {'Text Length':>{length_width}}"
    separator = f"{'-' * id_width}-+-{'-' * status_width}-+-{'-' * length_width}"
    print(header)
    print(separator)
    for university_id, status, text_length in rows:
        print(f"{university_id:<{id_width}} | {status:<{status_width}} | {text_length:>{length_width}}")

    print()
    print(
        "Total: {Total} | Success: {Success} | Manual: {Manual} | Blocked/Invalid: {Blocked/Invalid} | Failed: {Failed}".format(
            **summary
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
