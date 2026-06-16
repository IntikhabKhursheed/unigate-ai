# UniGate

UniGate is an AI-powered global university admissions intelligence platform.
It helps students discover universities with open admissions, deadlines, fee requirements, and program details across multiple countries.

## What this repo contains

- `scraper/`: Python scraper that collects raw admission page content
- `extraction/`: Python module that turns raw content into structured JSON with Gemini
- `server/`: Node.js + Express API with MongoDB
- `client/`: React + Vite + Tailwind UI
- `data/`: Shared raw and processed data outputs

## Architecture

```text
Student
  -> Client (React + Vite + Tailwind)
    -> Server API (Express + MongoDB)
      -> Processed admissions data
        -> Extraction (Python + Gemini)
          -> Raw scraped pages
            -> Scraper (Python + Playwright)
              -> University admission pages
```

## Core features

- Scrape university admission pages from public websites
- Extract structured admission data from unstructured text
- Search universities by country, program, fee type, and deadline
- Ask natural-language questions and convert them into filters
- Recommend universities based on a student profile

## Tech Stack

- Python 3.11+
- Playwright
- Gemini API
- Node.js + Express
- MongoDB + Mongoose
- React + Vite
- Tailwind CSS

## Setup

### 1. Install server dependencies

```bash
cd server
npm install
```

### 2. Install client dependencies

```bash
cd client
npm install
```

### 3. Install Python dependencies

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium

cd ../extraction
pip install -r requirements.txt
```

### 4. Start MongoDB locally

```bash
docker compose up -d
```

### 5. Configure environment variables

Copy `.env.example` to `.env` and fill in your values.

### 6. Install Playwright browsers

```bash
python -m playwright install chromium
```

This only needs to be done once after installing the Python dependencies.

## Manual Data Collection

When automated scraping is blocked, use the manual workflow described in [`data/manual/README.md`](data/manual/README.md).

In short:

1. Open the university admission page in a browser.
2. Copy the relevant text for program details, deadlines, fees, and scholarships.
3. Save it as `data/manual/{university_id}.txt` in UTF-8 plain text.
4. Re-run `python scraper/scrape.py --all` so the manual file is used instead of a live scrape.

## Data flow

1. The scraper fetches admission pages and stores raw HTML/text in `data/raw/`
2. The extraction module reads raw files and generates clean JSON in `data/processed/`
3. The server reads processed data, stores it in MongoDB, and serves API endpoints
4. The client queries the server and presents search, compare, and recommendation views

## Full Pipeline

Run the pipeline in this order:

```bash
python scraper/scrape.py --all
python extraction/extract.py --all
python scraper/report.py
python extraction/report.py
python extraction/validate.py
```

If you need to process one university at a time:

```bash
python scraper/scrape.py --id uoft-cs
python extraction/extract.py --id uoft-cs
```

## Current status

This is an initial scaffold with the scraping and extraction pipeline wired up.

### Raw data

- `fast-nu-cs`: raw data exists, but the live scrape was blocked or invalid
- `nust-cs`: raw data exists, but the live scrape hit network/DNS issues in this environment
- `metu-cs`: raw data exists, but the live scrape was blocked or invalid
- `tu-berlin-cs`: raw data exists, but the live scrape was blocked or invalid
- `uoft-cs`: raw data exists and is the best current extraction candidate

### Processed data

- No processed university files exist yet because the Toronto extraction failed in this environment due an invalid Gemini API key

### Manual data entry

- Manual placeholder files exist for `fast-nu-cs`, `nust-cs`, `metu-cs`, and `tu-berlin-cs`
- Add real text to `data/manual/{university_id}.txt` when automated scraping is blocked or incomplete

The TODO markers in the code show where additional scraping resilience, extraction refinements, and backend wiring can be added next.

## Vercel Deployment

This repository is configured as a monorepo for Vercel:

- `client/` builds the React app
- `server/api/` contains the serverless function implementations
- root `api/` contains thin wrappers so Vercel can discover the functions from the repo root

Deployment notes:

- The client defaults to `/api` as its backend base URL in production
- Vercel builds the client from `client/` and serves `client/dist`
- The serverless functions read `MONGODB_URI`, `GEMINI_API_KEY`, and `GEMINI_MODEL` from Vercel environment variables

For local development, keep using:

```bash
cd server
npm run dev

cd ../client
npm run dev
```
