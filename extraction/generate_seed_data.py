"""
AI seed data generator for UniGate.

This script uses the Gemini REST API to create realistic demo admissions
records for a fixed set of universities and saves them into data/processed.
It skips universities that already have processed files on disk so it only
fills in missing seed data.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

import extract
from seed_targets import ADDITIONAL_SEED_TARGETS, COUNTRY_FALLBACK_RULES


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
PROCESSED_DATA_DIR = (PROJECT_ROOT / "data" / "processed").resolve()


BASE_SEED_TARGETS: list[dict[str, str]] = [
    {
        "university_id": "nust-cs",
        "university_name": "National University of Sciences and Technology (NUST)",
        "country": "Pakistan",
        "degree_level": "Masters",
        "program_name": "MS Computer Science",
        "admissions_url": "https://admissions.nust.edu.pk/",
    },
    {
        "university_id": "fast-nu-cs",
        "university_name": "FAST National University (FAST-NUCES)",
        "country": "Pakistan",
        "degree_level": "Masters",
        "program_name": "MS Computer Science",
        "admissions_url": "https://www.nu.edu.pk/Admission/Schedule",
    },
    {
        "university_id": "metu-cs",
        "university_name": "Middle East Technical University (METU)",
        "country": "Turkey",
        "degree_level": "Masters",
        "program_name": "MS Computer Engineering",
        "admissions_url": "https://oibs2.metu.edu.tr/",
    },
    {
        "university_id": "tu-berlin-cs",
        "university_name": "Technical University of Berlin",
        "country": "Germany",
        "degree_level": "Masters",
        "program_name": "MSc Computer Science",
        "admissions_url": "https://www.tu.berlin/en/studying/prospective-students/degree-programmes",
    },
    {
        "university_id": "manchester-ai",
        "university_name": "University of Manchester",
        "country": "UK",
        "degree_level": "Masters",
        "program_name": "MSc Artificial Intelligence",
        "admissions_url": "https://www.manchester.ac.uk/study/masters/courses/list/",
    },
    {
        "university_id": "rwth-aachen-ds",
        "university_name": "RWTH Aachen University",
        "country": "Germany",
        "degree_level": "Masters",
        "program_name": "MSc Data Science",
        "admissions_url": "https://www.rwth-aachen.de/cms/root/studium/en/",
    },
    {
        "university_id": "bogazici-cs",
        "university_name": "Bogazici University",
        "country": "Turkey",
        "degree_level": "Masters",
        "program_name": "MS Computer Engineering",
        "admissions_url": "https://cmpe.bogazici.edu.tr/",
    },
]


ALL_SEED_TARGETS = BASE_SEED_TARGETS + ADDITIONAL_SEED_TARGETS
SEED_TARGETS_BY_ID = {entry["university_id"]: entry for entry in ALL_SEED_TARGETS}

SYSTEM_INSTRUCTION = extract.SYSTEM_INSTRUCTION


OFFLINE_FALLBACK_RECORDS: dict[str, dict[str, Any]] = {
    "nust-cs": {
        "university_name": "National University of Sciences and Technology (NUST)",
        "country": "Pakistan",
        "program_name": "MS Computer Science",
        "degree_level": "Masters",
        "application_deadline_start": "2026-06-01",
        "application_deadline_end": "2026-07-15",
        "application_fee_required": True,
        "application_fee_amount": 3000,
        "application_fee_currency": "PKR",
        "scholarship_available": True,
        "scholarship_details": "Merit-based fee waivers and need-based financial assistance available for eligible students.",
        "program_url": "https://admissions.nust.edu.pk/",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. Verify the admissions details on the official website.",
    },
    "fast-nu-cs": {
        "university_name": "FAST National University (FAST-NUCES)",
        "country": "Pakistan",
        "program_name": "MS Computer Science",
        "degree_level": "Masters",
        "application_deadline_start": "2026-06-15",
        "application_deadline_end": "2026-08-01",
        "application_fee_required": True,
        "application_fee_amount": 4000,
        "application_fee_currency": "PKR",
        "scholarship_available": True,
        "scholarship_details": "Merit scholarships and financial aid programs available based on academic performance and need.",
        "program_url": "https://www.nu.edu.pk/Admission/Schedule",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. Verify the admissions details on the official website.",
    },
    "metu-cs": {
        "university_name": "Middle East Technical University (METU)",
        "country": "Turkey",
        "program_name": "MS Computer Engineering",
        "degree_level": "Masters",
        "application_deadline_start": "2026-05-01",
        "application_deadline_end": "2026-06-30",
        "application_fee_required": False,
        "application_fee_amount": None,
        "application_fee_currency": None,
        "scholarship_available": True,
        "scholarship_details": "Graduate assistantships and tuition waivers available for qualified international students.",
        "program_url": "https://oibs2.metu.edu.tr/",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. Verify the admissions details on the official website.",
    },
    "tu-berlin-cs": {
        "university_name": "Technical University of Berlin",
        "country": "Germany",
        "program_name": "MSc Computer Science",
        "degree_level": "Masters",
        "application_deadline_start": "2026-05-01",
        "application_deadline_end": "2026-07-15",
        "application_fee_required": False,
        "application_fee_amount": 0,
        "application_fee_currency": "EUR",
        "scholarship_available": False,
        "scholarship_details": None,
        "program_url": "https://www.tu.berlin/en/studying/prospective-students/degree-programmes",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. TU Berlin charges a semester contribution fee (no separate application fee). Verify the admissions details on the official website.",
    },
    "manchester-ai": {
        "university_name": "University of Manchester",
        "country": "UK",
        "program_name": "MSc Artificial Intelligence",
        "degree_level": "Masters",
        "application_deadline_start": "2026-06-01",
        "application_deadline_end": "2027-01-31",
        "application_fee_required": False,
        "application_fee_amount": 0,
        "application_fee_currency": "GBP",
        "scholarship_available": True,
        "scholarship_details": "Various merit-based and country-specific scholarships available for international students.",
        "program_url": "https://www.manchester.ac.uk/study/masters/courses/list/",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. Verify the admissions details on the official website.",
    },
    "rwth-aachen-ds": {
        "university_name": "RWTH Aachen University",
        "country": "Germany",
        "program_name": "MSc Data Science",
        "degree_level": "Masters",
        "application_deadline_start": "2026-05-01",
        "application_deadline_end": "2026-07-01",
        "application_fee_required": False,
        "application_fee_amount": 0,
        "application_fee_currency": "EUR",
        "scholarship_available": False,
        "scholarship_details": None,
        "program_url": "https://www.rwth-aachen.de/cms/root/studium/en/",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. RWTH Aachen charges a semester contribution fee (no separate application fee). Verify the admissions details on the official website.",
    },
    "bogazici-cs": {
        "university_name": "Bogazici University",
        "country": "Turkey",
        "program_name": "MS Computer Engineering",
        "degree_level": "Masters",
        "application_deadline_start": "2026-05-15",
        "application_deadline_end": "2026-06-30",
        "application_fee_required": False,
        "application_fee_amount": None,
        "application_fee_currency": None,
        "scholarship_available": True,
        "scholarship_details": "Graduate assistantships available for qualified students, providing tuition waiver and stipend.",
        "program_url": "https://cmpe.bogazici.edu.tr/",
        "notes": "Offline demo fallback used because Gemini was unavailable in this environment. Verify the admissions details on the official website.",
    },
}


def _configure_api() -> tuple[str, str]:
    """Load the Gemini API settings from the same env variables used by extract.py."""
    if not extract.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing from the environment.")
    return extract.GEMINI_API_KEY, extract.GEMINI_MODEL


def _build_prompt(entry: dict[str, str]) -> str:
    """Build the seed-generation prompt for a single university."""
    return (
        f"Based on your general knowledge, provide typical admissions information for the "
        f"{entry['program_name']} program at {entry['university_name']}, {entry['country']}. "
        "Include realistic typical values for application deadlines, fees, and scholarship availability. "
        "Be specific - include actual typical fee amounts if known. Set extraction_confidence to 'low' "
        "and note this is AI-generated from general knowledge. Return ONLY valid JSON matching this schema:\n\n"
        f"{SYSTEM_INSTRUCTION}"
    )


def _extract_response_text(payload: dict[str, Any]) -> str:
    """Pull the JSON string out of a Gemini REST response."""
    direct_text = payload.get("text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    for candidate in payload.get("candidates", []):
        if not isinstance(candidate, dict):
            continue
        content = candidate.get("content", {})
        if not isinstance(content, dict):
            continue
        parts = content.get("parts", [])
        if not isinstance(parts, list):
            continue
        for part in parts:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

    raise ValueError("Gemini REST response did not contain any text.")


def _call_gemini_rest(api_key: str, model_name: str, prompt: str) -> str:
    """Call Gemini through the REST API and return the raw text payload."""
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
    response = requests.post(
        endpoint,
        params={"key": api_key},
        json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        },
        timeout=90,
    )

    if response.status_code >= 400:
        raise RuntimeError(f"Gemini REST API failed with HTTP {response.status_code}: {response.text}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError("Gemini REST API returned non-JSON output.") from exc

    return _extract_response_text(payload)


def _parse_gemini_response(response_text: str) -> dict[str, Any]:
    """Parse the model output into a JSON object."""
    parsed = json.loads(response_text)
    if not isinstance(parsed, dict):
        raise ValueError("Gemini response must be a JSON object.")
    return parsed


def _normalize_seed_payload(parsed: dict[str, Any], entry: dict[str, str]) -> dict[str, Any]:
    """Validate and normalize a generated seed payload."""
    normalized = {
        "university_name": parsed.get("university_name") or entry["university_name"],
        "country": parsed.get("country") or entry["country"],
        "program_name": parsed.get("program_name") or entry["program_name"],
        "degree_level": parsed.get("degree_level") or entry["degree_level"],
        "application_deadline_start": parsed.get("application_deadline_start"),
        "application_deadline_end": parsed.get("application_deadline_end"),
        "application_fee_required": parsed.get("application_fee_required"),
        "application_fee_amount": parsed.get("application_fee_amount"),
        "application_fee_currency": parsed.get("application_fee_currency"),
        "scholarship_available": parsed.get("scholarship_available"),
        "scholarship_details": parsed.get("scholarship_details"),
        "program_url": parsed.get("program_url") or entry["admissions_url"],
        "extraction_confidence": parsed.get("extraction_confidence") or "low",
        "notes": "",
    }

    notes = parsed.get("notes") or ""
    note_bits: list[str] = [notes] if notes else []
    note_bits.append("AI-generated from general knowledge and should be verified on the official website.")
    if not parsed.get("university_name"):
        note_bits.append("university_name populated from config")
    if not parsed.get("country"):
        note_bits.append("country populated from config")
    if not parsed.get("program_url"):
        note_bits.append("program_url populated from config")

    normalized["notes"] = "; ".join(note_bits).strip("; ")

    extract._basic_validate_extracted_data(normalized)
    return normalized


def _build_generic_offline_fallback(entry: dict[str, str]) -> dict[str, Any]:
    """Create a country-aware offline record when Gemini cannot be reached."""
    fallback = COUNTRY_FALLBACK_RULES.get(entry["country"], {})
    degree_level = entry["degree_level"]
    is_phd = degree_level == "PhD"
    default_fee_required = fallback.get("application_fee_required", True)
    default_fee_amount = fallback.get("application_fee_amount", 100)
    default_fee_currency = fallback.get("application_fee_currency", "USD")

    if not default_fee_required:
        default_fee_amount = 0

    if is_phd:
        default_fee_required = True
        default_fee_amount = fallback.get("application_fee_amount", 100)
        default_fee_currency = fallback.get("application_fee_currency", "USD")

    notes = (
        "Offline demo fallback used because Gemini was unavailable in this environment. "
        "Verify the admissions details on the official website."
    )

    if fallback.get("scholarship_details"):
        scholarship_details = fallback["scholarship_details"]
    else:
        scholarship_details = "Scholarship availability varies by intake and should be verified on the official website."

    normalized = {
        "university_name": entry["university_name"],
        "country": entry["country"],
        "program_name": entry["program_name"],
        "degree_level": degree_level,
        "application_deadline_start": fallback.get("application_deadline_start", "2026-01-15"),
        "application_deadline_end": fallback.get("application_deadline_end", "2026-04-30"),
        "application_fee_required": default_fee_required,
        "application_fee_amount": default_fee_amount,
        "application_fee_currency": default_fee_currency,
        "scholarship_available": bool(fallback.get("scholarship_available", True)),
        "scholarship_details": scholarship_details,
        "program_url": entry["admissions_url"],
        "extraction_confidence": "low",
        "notes": notes,
    }
    extract._basic_validate_extracted_data(normalized)
    return normalized


def _build_offline_fallback(entry: dict[str, str]) -> dict[str, Any]:
    """Build an offline demo payload when Gemini cannot be reached."""
    fallback = OFFLINE_FALLBACK_RECORDS.get(entry["university_id"])
    if fallback is None:
        return _build_generic_offline_fallback(entry)

    normalized = {
        "university_name": fallback["university_name"],
        "country": fallback["country"],
        "program_name": fallback["program_name"],
        "degree_level": fallback["degree_level"],
        "application_deadline_start": fallback["application_deadline_start"],
        "application_deadline_end": fallback["application_deadline_end"],
        "application_fee_required": fallback["application_fee_required"],
        "application_fee_amount": fallback["application_fee_amount"],
        "application_fee_currency": fallback["application_fee_currency"],
        "scholarship_available": fallback["scholarship_available"],
        "scholarship_details": fallback["scholarship_details"],
        "program_url": fallback["program_url"],
        "extraction_confidence": "low",
        "notes": fallback["notes"],
    }
    extract._basic_validate_extracted_data(normalized)
    return normalized


def _save_json(path: Path, payload: dict[str, Any]) -> None:
    """Write a JSON payload to disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
        file.write("\n")


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


def _should_retry(exc: Exception) -> bool:
    """Decide whether a Gemini call should be retried."""
    if isinstance(exc, requests.RequestException):
        return True

    message = str(exc).lower()
    retry_markers = (
        "rate",
        "timeout",
        "temporarily unavailable",
        "connection",
        "network",
        "503",
        "504",
        "429",
        "forbidden",
        "permission denied",
    )
    return any(marker in message for marker in retry_markers)


def _process_entry(
    entry: dict[str, str],
    *,
    dry_run: bool,
    api_key: str,
    model_name: str,
) -> dict[str, Any] | None:
    """Generate one seed record."""
    output_path = PROCESSED_DATA_DIR / f"{entry['university_id']}.json"
    if output_path.exists():
        print(f"[{entry['university_id']}] Skipping because processed file already exists at {output_path}")
        return None

    prompt = _build_prompt(entry)
    retries = 2

    for attempt in range(1, retries + 1):
        try:
            response_text = _call_gemini_rest(api_key, model_name, prompt)
            try:
                parsed = _parse_gemini_response(response_text)
            except json.JSONDecodeError:
                error_path = _save_error_response(entry["university_id"], response_text)
                print(f"[{entry['university_id']}] Invalid JSON from Gemini. Saved debug payload to {error_path}")
                return None

            extracted = _normalize_seed_payload(parsed, entry)
            extracted["university_id"] = entry["university_id"]
            extracted["source_url"] = entry["admissions_url"]
            extracted["extracted_at"] = datetime.now(timezone.utc).isoformat()

            if dry_run:
                print(json.dumps(extracted, indent=2, ensure_ascii=False))
            else:
                _save_json(output_path, extracted)
                print(f"[{entry['university_id']}] Saved generated seed data to {output_path}")

            return extracted
        except Exception as exc:  # noqa: BLE001
            if _should_retry(exc) and attempt < retries:
                backoff_seconds = 2 ** (attempt - 1)
                print(f"[{entry['university_id']}] Gemini REST call failed ({exc}). Retrying in {backoff_seconds}s...")
                time.sleep(backoff_seconds)
                continue

            print(f"[{entry['university_id']}] Gemini unavailable, using offline fallback: {exc}")
            offline = _build_offline_fallback(entry)
            offline["university_id"] = entry["university_id"]
            offline["source_url"] = entry["admissions_url"]
            offline["extracted_at"] = datetime.now(timezone.utc).isoformat()

            if dry_run:
                print(json.dumps(offline, indent=2, ensure_ascii=False))
            else:
                _save_json(output_path, offline)
                print(f"[{entry['university_id']}] Saved offline fallback to {output_path}")

            return offline

    return None


def _get_entries(university_id: str | None) -> list[dict[str, str]]:
    """Return all configured entries or a single university."""
    if university_id:
        matches = [entry for entry in ALL_SEED_TARGETS if entry["university_id"] == university_id]
        if not matches:
            raise ValueError(f"Unknown university_id: {university_id}")
        return matches
    return ALL_SEED_TARGETS


def process_all(*, dry_run: bool) -> list[dict[str, Any]]:
    """Generate all configured seed records."""
    api_key, model_name = _configure_api()
    results: list[dict[str, Any]] = []
    entries = _get_entries(None)
    for index, entry in enumerate(entries):
        generated = _process_entry(entry, dry_run=dry_run, api_key=api_key, model_name=model_name)
        if generated is not None:
            results.append(generated)
        if index < len(entries) - 1:
            time.sleep(2)
    return results


def process_single(university_id: str, *, dry_run: bool) -> dict[str, Any] | None:
    """Generate one seed record by university ID."""
    api_key, model_name = _configure_api()
    return _process_entry(_get_entries(university_id)[0], dry_run=dry_run, api_key=api_key, model_name=model_name)


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI parser."""
    parser = argparse.ArgumentParser(description="Generate AI seed admissions data with Gemini REST API.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Generate all seed records")
    group.add_argument("--id", dest="university_id", help="Generate one university ID")
    parser.add_argument("--dry-run", action="store_true", help="Print output without saving it")
    return parser


def main() -> int:
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
    except ValueError as exc:
        print(f"Input error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
