"""
UniGate extraction module.

This module reads raw scraped university pages and converts them into a strict
JSON structure using Gemini. The final output is written to data/processed.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from jsonschema import validate


load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
RAW_DATA_DIR = (BASE_DIR / ".." / "data" / "raw").resolve()
PROCESSED_DATA_DIR = (BASE_DIR / ".." / "data" / "processed").resolve()


UNIVERSITY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "university_name": {"type": "string"},
        "country": {"type": "string"},
        "program_name": {"type": "string"},
        "degree_level": {"type": "string"},
        "application_deadline_start": {"type": ["string", "null"]},
        "application_deadline_end": {"type": ["string", "null"]},
        "application_fee": {
            "type": "object",
            "properties": {
                "required": {"type": "boolean"},
                "amount": {"type": ["number", "null"]},
                "currency": {"type": ["string", "null"]},
            },
            "required": ["required", "amount", "currency"],
            "additionalProperties": False,
        },
        "scholarship_available": {"type": "boolean"},
        "program_url": {"type": "string"},
        "last_updated": {"type": "string"},
        "confidence": {"type": "number"},
        "status": {"type": "string"},
        "notes": {"type": "string"},
    },
    "required": [
        "university_name",
        "country",
        "program_name",
        "degree_level",
        "application_deadline_start",
        "application_deadline_end",
        "application_fee",
        "scholarship_available",
        "program_url",
        "last_updated",
        "confidence",
        "status",
        "notes",
    ],
    "additionalProperties": False,
}


def load_raw_payload(path: Path) -> dict[str, Any]:
    """Load a raw scrape file from disk."""
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def extract_structured_data(raw_payload: dict[str, Any]) -> dict[str, Any]:
    """
    Convert raw page content into structured admissions data.

    TODO: Replace the placeholder implementation with Gemini prompting and
    response parsing. The final version should:
    - send the raw text/html to Gemini
    - parse the returned JSON
    - validate it against the schema
    - assign a confidence score and status
    """
    extracted = {
        "university_name": raw_payload.get("university_name", ""),
        "country": raw_payload.get("country", ""),
        "program_name": "TODO: add program name",
        "degree_level": "TODO: add degree level",
        "application_deadline_start": None,
        "application_deadline_end": None,
        "application_fee": {
            "required": False,
            "amount": None,
            "currency": None,
        },
        "scholarship_available": False,
        "program_url": raw_payload.get("admission_page_url", ""),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "confidence": 0.0,
        "status": "todo",
        "notes": "TODO: implement Gemini extraction logic.",
    }
    validate(instance=extracted, schema=UNIVERSITY_SCHEMA)
    return extracted


def save_processed_payload(university_id: str, payload: dict[str, Any]) -> Path:
    """Write extracted JSON to the processed data directory."""
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DATA_DIR / f"{university_id}.json"
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
    return output_path


def main() -> None:
    """Process every raw file found in data/raw."""
    for raw_file in RAW_DATA_DIR.glob("*.json"):
        raw_payload = load_raw_payload(raw_file)
        extracted = extract_structured_data(raw_payload)
        output_path = save_processed_payload(raw_payload["university_id"], extracted)
        print(f"Saved processed data to {output_path}")


if __name__ == "__main__":
    main()
