"""
UniGate scraper module.

This script visits university admissions pages, extracts visible text from the
page body, and saves raw scraping results in data/raw for later Gemini
extraction.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - fallback for clean environments
    def load_dotenv() -> bool:  # type: ignore[override]
        return False


load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
RAW_DATA_DIR = (PROJECT_ROOT / "data" / "raw").resolve()
UNIVERSITIES_FILE = BASE_DIR / "config" / "universities.json"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
VIEWPORT = {"width": 1280, "height": 800}
BLOCKED_PHRASES = (
    "403 forbidden",
    "access denied",
    "just a moment",
    "cloudflare",
    "page not found",
)

DEFAULT_UNIVERSITIES: list[dict[str, str]] = [
    {
        "id": "fast-nu-cs",
        "name": "FAST National University",
        "country": "Pakistan",
        "admission_page_url": "https://www.nu.edu.pk/Admission/Schedule",
        "program_level": "Masters",
        "field": "Computer Science",
    },
    {
        "id": "nust-cs",
        "name": "NUST",
        "country": "Pakistan",
        "admission_page_url": "https://admissions.nust.edu.pk/",
        "program_level": "Masters",
        "field": "Computer Science",
    },
    {
        "id": "metu-cs",
        "name": "Middle East Technical University",
        "country": "Turkey",
        "admission_page_url": "https://oibs2.metu.edu.tr/Eng/login.aspx",
        "program_level": "Masters",
        "field": "Computer Science",
        "manual_check_needed": True,
    },
    {
        "id": "tu-berlin-cs",
        "name": "Technical University of Berlin",
        "country": "Germany",
        "admission_page_url": "https://www.tu.berlin/en/studying/prospective-students/degree-programmes",
        "program_level": "Masters",
        "field": "Computer Science",
    },
    {
        "id": "uoft-cs",
        "name": "University of Toronto",
        "country": "Canada",
        "admission_page_url": "https://web.cs.toronto.edu/graduate/admissions",
        "program_level": "Masters",
        "field": "Computer Science",
    },
]


def ensure_universities_file() -> None:
    """Create the seed universities file if it doesn't exist yet."""
    UNIVERSITIES_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not UNIVERSITIES_FILE.exists():
        with UNIVERSITIES_FILE.open("w", encoding="utf-8") as file:
            json.dump(DEFAULT_UNIVERSITIES, file, indent=2, ensure_ascii=False)


def load_universities() -> list[dict[str, Any]]:
    """Load university targets from the seed file."""
    ensure_universities_file()
    with UNIVERSITIES_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        raise ValueError("universities.json must contain a JSON array.")
    return data


def save_raw_payload(university_id: str, payload: dict[str, Any]) -> Path:
    """Save a raw scrape result to data/raw/{id}.json."""
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RAW_DATA_DIR / f"{university_id}.json"
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
    return output_path


def truncate_text(text: str, limit: int = 15000) -> str:
    """Trim long text so the extraction step stays within context limits."""
    cleaned = text.strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rstrip()


def classify_scrape_output(raw_text: str) -> tuple[str, str | None]:
    """Mark obvious blocked or useless pages so we do not trust them as success."""
    cleaned = raw_text.strip()
    lower_text = cleaned.lower()
    if len(cleaned) < 500:
        return "blocked_or_invalid", "Extracted text was too short to be useful for extraction."
    if any(phrase in lower_text for phrase in BLOCKED_PHRASES):
        return "blocked_or_invalid", "Extracted text appears to be a blocked or invalid page."
    return "success", None


def extract_visible_text(page) -> str:
    """
    Extract visible text from the page body after stripping noisy tags.
    """
    return page.evaluate(
        """
        () => {
          const root = document.body;
          if (!root) return "";

          const clone = root.cloneNode(true);
          clone.querySelectorAll("script, style, nav, footer, noscript, svg, iframe").forEach((node) => node.remove());

          const text = clone.innerText || clone.textContent || "";
          return text.replace(/\\s+/g, " ").trim();
        }
        """
    )


def scrape_university(page, university: dict[str, Any]) -> dict[str, Any]:
    """Visit one admissions page and return a normalized raw payload."""
    source_url = university["admission_page_url"]
    scraped_at = datetime.now(timezone.utc).isoformat()

    try:
        page.goto(source_url, wait_until="domcontentloaded", timeout=45000)

        raw_text = extract_visible_text(page)
        raw_text = truncate_text(raw_text)
        scrape_status, quality_note = classify_scrape_output(raw_text)

        return {
            "university_id": university["id"],
            "source_url": source_url,
            "scraped_at": scraped_at,
            "raw_text": raw_text,
            "scrape_status": scrape_status,
            "error_message": quality_note,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "university_id": university["id"],
            "source_url": source_url,
            "scraped_at": scraped_at,
            "raw_text": "",
            "scrape_status": "failed",
            "error_message": str(exc),
        }


def run_scraper(target_universities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Scrape all requested universities with a single browser session."""
    results: list[dict[str, Any]] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT, viewport=VIEWPORT)

        for index, university in enumerate(target_universities):
            page = context.new_page()
            payload = scrape_university(page, university)
            page.close()
            results.append(payload)
            output_path = save_raw_payload(university["id"], payload)

            if payload["scrape_status"] == "success":
                print(f"[{university['id']}] saved {output_path}")
            elif payload["scrape_status"] == "blocked_or_invalid":
                print(f"[{university['id']}] blocked_or_invalid: {payload['error_message']}")
            else:
                print(f"[{university['id']}] failed: {payload['error_message']}")

            if index < len(target_universities) - 1:
                time.sleep(random.uniform(2, 5))

        context.close()
        browser.close()

    return results


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI parser."""
    parser = argparse.ArgumentParser(description="Scrape university admissions pages.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Scrape all universities in universities.json")
    group.add_argument("--id", dest="university_id", help="Scrape a single university ID")
    return parser


def main() -> int:
    """CLI entry point."""
    parser = build_parser()
    args = parser.parse_args()

    universities = load_universities()
    if args.all:
        targets = universities
    else:
        targets = [item for item in universities if item.get("id") == args.university_id]
        if not targets:
            print(f"No university found with id '{args.university_id}'.")
            return 1

    run_scraper(targets)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
