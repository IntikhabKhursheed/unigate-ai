"""
UniGate extraction module.

This script reads raw scraped university admission pages from data/raw,
sends the text to Gemini, validates the JSON response, and saves structured
records in data/processed.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - dependency is installed from requirements.txt
    genai = None  # type: ignore[assignment]

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dependency is installed from requirements.txt
    def load_dotenv() -> bool:  # type: ignore[override]
        """Fallback `.env` loader for clean environments without python-dotenv."""
        project_root = Path(__file__).resolve().parent.parent
        env_path = project_root / ".env"
        if not env_path.exists():
            env_path = Path(__file__).resolve().parent / ".env"
        if not env_path.exists():
            return False

        loaded = False
        with env_path.open("r", encoding="utf-8") as file:
            for line in file:
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                key, value = stripped.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("'\""))
                loaded = True
        return loaded


load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
RAW_DATA_DIR = (PROJECT_ROOT / "data" / "raw").resolve()
PROCESSED_DATA_DIR = (PROJECT_ROOT / "data" / "processed").resolve()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

SYSTEM_INSTRUCTION = """
You are a data extraction assistant. Extract university admission information from the following webpage text. Return ONLY valid JSON matching this exact schema, with no markdown formatting or extra text:

{
  "university_name": string,
  "country": string,
  "program_name": string,
  "degree_level": string (one of: "Bachelors", "Masters", "PhD", "Other"),
  "application_deadline_start": string (ISO date YYYY-MM-DD) or null,
  "application_deadline_end": string (ISO date YYYY-MM-DD) or null,
  "application_fee_required": boolean,
  "application_fee_amount": number or null,
  "application_fee_currency": string or null,
  "scholarship_available": boolean,
  "scholarship_details": string or null,
  "program_url": string or null,
  "extraction_confidence": string (one of: "high", "medium", "low"),
  "notes": string (any caveats, ambiguities, or missing info)
}

Rules:
- If a field cannot be confidently determined from the text, set it to null and lower extraction_confidence
- Do not guess or hallucinate dates, fees, or program names
- If the text contains multiple programs, extract the one most relevant to Computer Science / Data Science / Engineering if mentioned, otherwise the first program found
- Set extraction_confidence to 'low' if the text seems incomplete, irrelevant, or doesn't appear to be an admissions page
""".strip()


def load_raw_payload(path: Path) -> dict[str, Any]:
    """Load a raw scrape payload from disk."""
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _basic_validate_extracted_data(payload: dict[str, Any]) -> None:
    """Validate the Gemini response with lightweight type checks."""
    required_string_fields = [
        "program_name",
        "degree_level",
        "notes",
        "extraction_confidence",
    ]
    required_nullable_string_fields = [
        "university_name",
        "country",
        "application_deadline_start",
        "application_deadline_end",
        "application_fee_currency",
        "scholarship_details",
        "program_url",
    ]
    required_boolean_fields = [
        "application_fee_required",
        "scholarship_available",
    ]
    required_number_fields = [
        "application_fee_amount",
    ]

    for field in required_string_fields:
        if not isinstance(payload.get(field), str) or not payload.get(field):
            raise ValueError(f"Field '{field}' must be a non-empty string.")

    for field in required_nullable_string_fields:
        value = payload.get(field)
        if value is not None and not isinstance(value, str):
            raise ValueError(f"Field '{field}' must be a string or null.")

    for field in required_boolean_fields:
        if not isinstance(payload.get(field), bool):
            raise ValueError(f"Field '{field}' must be a boolean.")

    for field in required_number_fields:
        value = payload.get(field)
        if value is not None and not isinstance(value, (int, float)):
            raise ValueError(f"Field '{field}' must be a number or null.")

    if payload["degree_level"] not in {"Bachelors", "Masters", "PhD", "Other"}:
        raise ValueError("Field 'degree_level' must be one of: Bachelors, Masters, PhD, Other.")

    if payload["extraction_confidence"] not in {"high", "medium", "low"}:
        raise ValueError("Field 'extraction_confidence' must be one of: high, medium, low.")


def _extract_raw_text(raw_payload: dict[str, Any]) -> str:
    """Pull the text body from a scraped raw payload."""
    raw_text = raw_payload.get("raw_text")
    if isinstance(raw_text, str) and raw_text.strip():
        return raw_text.strip()

    text = raw_payload.get("text")
    if isinstance(text, str) and text.strip():
        return text.strip()

    html = raw_payload.get("html")
    if isinstance(html, str) and html.strip():
        return html.strip()

    raise ValueError("Raw payload does not contain a usable 'raw_text' field.")


def _get_source_url(raw_payload: dict[str, Any]) -> str | None:
    """Read the source URL from the raw payload if available."""
    for key in ("source_url", "admission_page_url", "url"):
        value = raw_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _configure_model():
    """Create a configured Gemini model instance."""
    if genai is None:
        raise RuntimeError(
            "google-generativeai is not installed. Run: pip install -r extraction/requirements.txt"
        )

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing from the environment.")

    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
    )


def _call_gemini(model: genai.GenerativeModel, raw_text: str) -> str:
    """Send the scraped text to Gemini and return the raw JSON string."""
    response = model.generate_content(
        raw_text,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.2,
        },
    )

    response_text = getattr(response, "text", None)
    if not response_text:
        raise ValueError("Gemini returned an empty response.")

    return response_text.strip()


def _parse_gemini_response(response_text: str) -> dict[str, Any]:
    """Parse the model output into a JSON object."""
    parsed = json.loads(response_text)
    if not isinstance(parsed, dict):
        raise ValueError("Gemini response must be a JSON object.")
    return parsed


def _normalize_extracted_payload(
    parsed: dict[str, Any],
    raw_payload: dict[str, Any],
    university_id: str,
) -> dict[str, Any]:
    """Merge the model output with local metadata and enforce expected fields."""
    normalized = {
        "university_id": university_id,
        "source_url": _get_source_url(raw_payload),
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "university_name": parsed.get("university_name"),
        "country": parsed.get("country"),
        "program_name": parsed.get("program_name"),
        "degree_level": parsed.get("degree_level"),
        "application_deadline_start": parsed.get("application_deadline_start"),
        "application_deadline_end": parsed.get("application_deadline_end"),
        "application_fee_required": parsed.get("application_fee_required"),
        "application_fee_amount": parsed.get("application_fee_amount"),
        "application_fee_currency": parsed.get("application_fee_currency"),
        "scholarship_available": parsed.get("scholarship_available"),
        "scholarship_details": parsed.get("scholarship_details"),
        "program_url": parsed.get("program_url"),
        "extraction_confidence": parsed.get("extraction_confidence"),
        "notes": parsed.get("notes"),
    }
  
    print("DEBUG PARSED:", json.dumps(parsed, indent=2, ensure_ascii=False))
    print("DEBUG NORMALIZED:", json.dumps(normalized, indent=2, ensure_ascii=False))
    _basic_validate_extracted_data(normalized)
    return normalized

    _basic_validate_extracted_data(normalized)
    return normalized


def _save_json(path: Path, payload: dict[str, Any]) -> None:
    """Write a JSON payload to disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)


def _save_error_response(university_id: str, response_text: str) -> Path:
    """Store an invalid Gemini response for debugging."""
    error_path = PROCESSED_DATA_DIR / f"{university_id}_error.json"
    _save_json(
        error_path,
        {
            "university_id": university_id,
            "error_type": "json_parse_failure",
            "raw_response": response_text,
            "captured_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return error_path


def _process_single_file(
    raw_file: Path,
    *,
    dry_run: bool,
    model: genai.GenerativeModel,
) -> dict[str, Any] | None:
    """Process one raw file and return the extracted payload if successful."""
    raw_payload = load_raw_payload(raw_file)
    university_id = raw_payload.get("university_id") or raw_file.stem
    raw_text = _extract_raw_text(raw_payload)

    retries = 2
    for attempt in range(1, retries + 1):
        try:
            response_text = _call_gemini(model, raw_text)
            try:
                parsed = _parse_gemini_response(response_text)
            except json.JSONDecodeError:
                error_path = _save_error_response(university_id, response_text)
                print(f"[{university_id}] Invalid JSON from Gemini. Saved debug payload to {error_path}")
                return None

            extracted = _normalize_extracted_payload(parsed, raw_payload, university_id)

            if dry_run:
                print(json.dumps(extracted, indent=2, ensure_ascii=False))
            else:
                output_path = PROCESSED_DATA_DIR / f"{university_id}.json"
                _save_json(output_path, extracted)
                print(f"[{university_id}] Saved processed data to {output_path}")

            return extracted
        except Exception as exc:  # noqa: BLE001
            message = str(exc).lower()
            retryable = any(
                marker in message
                for marker in (
                    "rate",
                    "timeout",
                    "temporarily unavailable",
                    "connection",
                    "network",
                    "503",
                    "504",
                )
            )

            if retryable and attempt < retries:
                backoff_seconds = 2 ** (attempt - 1)
                print(f"[{university_id}] Gemini call failed ({exc}). Retrying in {backoff_seconds}s...")
                time.sleep(backoff_seconds)
                continue

            print(f"[{university_id}] Skipping after Gemini failure: {exc}")
            return None

    return None


def process_all(*, dry_run: bool) -> list[dict[str, Any]]:
    """Process all raw files found in data/raw."""
    if not RAW_DATA_DIR.exists():
        print(f"Raw data directory not found: {RAW_DATA_DIR}")
        return []

    raw_files = sorted(RAW_DATA_DIR.glob("*.json"))
    if not raw_files:
        print(f"No raw JSON files found in {RAW_DATA_DIR}")
        return []

    model = _configure_model()
    results: list[dict[str, Any]] = []
    for raw_file in raw_files:
        extracted = _process_single_file(raw_file, dry_run=dry_run, model=model)
        if extracted is not None:
            results.append(extracted)
    return results


def process_single(university_id: str, *, dry_run: bool) -> dict[str, Any] | None:
    """Process one raw file by university ID."""
    raw_file = RAW_DATA_DIR / f"{university_id}.json"
    if not raw_file.exists():
        print(f"Raw file not found: {raw_file}")
        return None

    model = _configure_model()
    return _process_single_file(raw_file, dry_run=dry_run, model=model)


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI parser."""
    parser = argparse.ArgumentParser(description="Extract structured admissions data with Gemini.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Process all files in data/raw/")
    group.add_argument("--id", dest="university_id", help="Process a single university ID")
    parser.add_argument("--dry-run", action="store_true", help="Print output without saving it")
    return parser


def main() -> int:
    """CLI entry point."""
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.all:
            process_all(dry_run=args.dry_run)
        else:
            process_single(args.university_id, dry_run=args.dry_run)
    except RuntimeError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
