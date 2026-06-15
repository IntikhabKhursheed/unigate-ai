"""Generate curated demo seed records for UniGate.

This script writes seven additional processed university JSON files into
data/processed/ so they can be seeded into MongoDB for demo/testing.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT_DIR / "data" / "processed"


SEED_RECORDS = [
    {
        "university_id": "nust-cs",
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
        "source_url": "https://admissions.nust.edu.pk/",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. Verify exact dates and fees on the official site.",
    },
    {
        "university_id": "fast-nu-cs",
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
        "source_url": "https://www.nu.edu.pk/Admission/Schedule",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. Verify exact dates and fees on the official site.",
    },
    {
        "university_id": "metu-cs",
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
        "source_url": "https://oibs2.metu.edu.tr/",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. Verify exact dates and fees on the official site.",
    },
    {
        "university_id": "tu-berlin-cs",
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
        "source_url": "https://www.tu.berlin/en/studying/prospective-students/degree-programmes",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. TU Berlin charges a semester contribution fee (no separate application fee). Verify exact dates and amounts on the official site.",
    },
    {
        "university_id": "manchester-ai",
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
        "source_url": "https://www.manchester.ac.uk/study/masters/courses/list/",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. Verify exact dates and fees on the official site.",
    },
    {
        "university_id": "rwth-aachen-ds",
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
        "source_url": "https://www.rwth-aachen.de/cms/root/studium/en/",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. RWTH Aachen charges a semester contribution fee (no separate application fee). Verify exact dates and amounts on the official site.",
    },
    {
        "university_id": "bogazici-cs",
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
        "source_url": "https://cmpe.bogazici.edu.tr/",
        "extraction_confidence": "manual_seed",
        "notes": "Manually curated seed data for demo purposes. Verify exact dates and fees on the official site.",
    },
]


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    extracted_at = datetime.now(timezone.utc).isoformat()

    for record in SEED_RECORDS:
        # Each record gets the same timestamp so the demo dataset is easy to audit.
        payload = dict(record)
        payload["extracted_at"] = extracted_at

        file_path = PROCESSED_DIR / f"{payload['university_id']}.json"
        file_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {file_path}")


if __name__ == "__main__":
    main()
