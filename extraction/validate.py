"""
UniGate processed-data validator.

Checks that each processed record contains the expected fields and values and
prints PASS/FAIL/WARNING messages for quick review.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
PROCESSED_DATA_DIR = (PROJECT_ROOT / "data" / "processed").resolve()

REQUIRED_FIELDS = [
    "university_name",
    "country",
    "program_name",
    "degree_level",
    "application_deadline_start",
    "application_deadline_end",
    "application_fee_required",
    "application_fee_amount",
    "application_fee_currency",
    "scholarship_available",
    "scholarship_details",
    "program_url",
    "extraction_confidence",
    "notes",
    "university_id",
    "source_url",
    "extracted_at",
]


def load_json(path: Path) -> dict[str, Any]:
    """Load a JSON object from disk."""
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path.name} must contain a JSON object.")
    return data


def validate_record(payload: dict[str, Any]) -> tuple[str, list[str]]:
    """Validate a single processed record."""
    issues: list[str] = []
    status = "PASS"

    for field in REQUIRED_FIELDS:
        if field not in payload:
            issues.append(f"Missing required field: {field}")
            status = "FAIL"

    degree_level = payload.get("degree_level")
    if degree_level not in {"Bachelors", "Masters", "PhD", "Other"}:
        issues.append("degree_level must be one of: Bachelors, Masters, PhD, Other")
        status = "FAIL"

    confidence = payload.get("extraction_confidence")
    if confidence not in {"high", "medium", "low"}:
        issues.append("extraction_confidence must be one of: high, medium, low")
        status = "FAIL"

    fee_required = payload.get("application_fee_required")
    fee_amount = payload.get("application_fee_amount")
    if fee_required is True and fee_amount is None:
        issues.append("WARNING: application_fee_required is true but application_fee_amount is null")
        if status == "PASS":
            status = "WARNING"

    return status, issues


def main() -> int:
    """Run validation across all processed files."""
    if not PROCESSED_DATA_DIR.exists():
        print(f"Processed data directory not found: {PROCESSED_DATA_DIR}")
        return 1

    files = sorted(
        path for path in PROCESSED_DATA_DIR.glob("*.json") if not path.name.endswith("_error.json")
    )
    if not files:
        print("No processed JSON files found.")
        return 0

    for processed_file in files:
        payload = load_json(processed_file)
        university_id = payload.get("university_id") or processed_file.stem
        status, issues = validate_record(payload)
        print(f"{university_id}: {status}")
        for issue in issues:
            print(f"  - {issue}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
