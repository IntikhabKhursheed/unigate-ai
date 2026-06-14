"""
UniGate scraper module.

This module is responsible for collecting raw HTML and visible text from
university admission pages. The extracted raw content is saved in data/raw.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
UNIVERSITIES_FILE = BASE_DIR / "config" / "universities.json"
RAW_DATA_DIR = (BASE_DIR / ".." / "data" / "raw").resolve()


def load_universities() -> list[dict]:
    """Load the university seed list from JSON."""
    with UNIVERSITIES_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_raw_payload(university: dict, payload: dict) -> Path:
    """Write raw scrape output to a file for later extraction."""
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RAW_DATA_DIR / f"{university['id']}.json"
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
    return output_path


def scrape_university(university: dict) -> dict:
    """
    Fetch the university admission page.

    TODO: Replace this placeholder with Playwright browser automation.
    The final implementation should capture:
    - final page URL
    - raw HTML
    - visible text
    - timestamp
    """
    return {
        "university_id": university["id"],
        "university_name": university["name"],
        "country": university["country"],
        "admission_page_url": university["admission_page_url"],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "html": "",
        "text": "",
        "status": "todo",
        "notes": "TODO: implement Playwright scraping logic.",
    }


def main() -> None:
    """Entry point for running the scraper manually."""
    universities = load_universities()
    for university in universities:
        payload = scrape_university(university)
        output_path = save_raw_payload(university, payload)
        print(f"Saved raw data for {university['id']} to {output_path}")


if __name__ == "__main__":
    main()
