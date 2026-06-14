"""
UniGate extraction report.

Prints a compact overview of the processed admissions records and any parsing
errors saved during extraction.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
PROCESSED_DATA_DIR = (PROJECT_ROOT / "data" / "processed").resolve()


def load_json(path: Path) -> dict[str, Any]:
    """Load a JSON file from disk."""
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path.name} must contain a JSON object.")
    return data


def main() -> int:
    """Print a processed-data report and any extraction error files."""
    rows: list[tuple[str, str, Any, Any, Any]] = []
    error_files: list[str] = []

    if not PROCESSED_DATA_DIR.exists():
        print(f"Processed data directory not found: {PROCESSED_DATA_DIR}")
        return 1

    for processed_file in sorted(PROCESSED_DATA_DIR.glob("*.json")):
        if processed_file.name.endswith("_error.json"):
            error_files.append(processed_file.name)
            continue

        payload = load_json(processed_file)
        university_id = str(payload.get("university_id") or processed_file.stem)
        rows.append(
            (
                university_id,
                str(payload.get("extraction_confidence", "")),
                payload.get("application_deadline_start"),
                payload.get("application_deadline_end"),
                payload.get("application_fee_required"),
            )
        )

    if rows:
        id_width = max(len("University ID"), *(len(row[0]) for row in rows))
        conf_width = max(len("Confidence"), *(len(row[1]) for row in rows))
        start_width = max(len("Deadline Start"), *(len(str(row[2])) for row in rows))
        end_width = max(len("Deadline End"), *(len(str(row[3])) for row in rows))
        fee_width = max(len("Fee Required"), *(len(str(row[4])) for row in rows))

        header = (
            f"{'University ID':<{id_width}} | {'Confidence':<{conf_width}} | "
            f"{'Deadline Start':<{start_width}} | {'Deadline End':<{end_width}} | {'Fee Required':<{fee_width}}"
        )
        separator = (
            f"{'-' * id_width}-+-{'-' * conf_width}-+-{'-' * start_width}-+-{'-' * end_width}-+-{'-' * fee_width}"
        )
        print(header)
        print(separator)
        for university_id, confidence, start, end, fee_required in rows:
            print(
                f"{university_id:<{id_width}} | {confidence:<{conf_width}} | "
                f"{str(start):<{start_width}} | {str(end):<{end_width}} | {str(fee_required):<{fee_width}}"
            )
    else:
        print("No processed JSON files found.")

    print()
    print(f"Error files found: {len(error_files)}")
    for error_file in error_files:
        payload = load_json(PROCESSED_DATA_DIR / error_file)
        university_id = payload.get("university_id") or error_file.replace("_error.json", "")
        print(f"- {university_id}: {error_file}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
