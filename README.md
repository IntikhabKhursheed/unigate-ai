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

cd ../extraction
pip install -r requirements.txt
```

### 4. Start MongoDB locally

```bash
docker compose up -d
```

### 5. Configure environment variables

Copy `.env.example` to `.env` and fill in your values.

## Data flow

1. The scraper fetches admission pages and stores raw HTML/text in `data/raw/`
2. The extraction module reads raw files and generates clean JSON in `data/processed/`
3. The server reads processed data, stores it in MongoDB, and serves API endpoints
4. The client queries the server and presents search, compare, and recommendation views

## Current status

This is an initial scaffold.
The TODO markers show where scraper logic, AI extraction prompts, validation, and real database wiring should be added next.
