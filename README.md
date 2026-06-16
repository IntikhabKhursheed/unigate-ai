# UniGate

UniGate — AI-Powered University Admissions Intelligence Platform

> Discover universities with open admissions worldwide. Search by natural language, filter by country and funding, compare programs side by side, and get AI-ranked recommendations — all in one place.

**Live Demo:** https://unigate-ai.vercel.app

---

## Overview

UniGate solves a real problem: finding universities with currently open admissions, across multiple countries, with accurate fee and scholarship information, is fragmented and time-consuming. Students check dozens of websites manually, miss deadlines, and have no way to compare programs side by side.

UniGate aggregates this data through an automated AI extraction pipeline, stores it in a structured database, and surfaces it through natural language search and a content-based recommendation engine — making the process faster and more accessible, particularly for students in regions like South Asia and the Middle East where information access is uneven.

---

## Key Features

- **Natural Language Search** — type "Masters in Germany with no application fee" and get structured results. Powered by Gemini AI parsing queries into structured MongoDB filters with keyword-search fallback.
- **AI Recommendation Engine** — input your field, degree level, preferred countries, and budget preference. A scoring algorithm ranks all universities by fit (degree match, country preference, fee type, scholarship availability, program relevance).
- **Side-by-Side Comparison** — select up to 3 universities and compare deadlines, fees, scholarships, and program details in a structured table with best-value highlights.
- **Automated Data Extraction Pipeline** — a Playwright-based scraper feeds raw university admission page text into a Gemini extraction prompt that returns structured JSON matching a strict schema, with confidence scoring and fallback handling.
- **185+ Universities** across 30+ countries including Pakistan, Germany, Turkey, Canada, UK, Singapore, South Korea, Japan, China, Netherlands, Belgium, Switzerland, Sweden, Norway, Finland, Australia, USA, and more.
- **Three Degree Levels** — Bachelors, Masters, and PhD programs.

---

## Architecture
┌─────────────────────────────────────────────────────┐

│                   DATA PIPELINE                      │

│                                                      │

│  scraper/ (Playwright)                               │

│       │ raw HTML/text → data/raw/{id}.json           │

│       ▼                                              │

│  extraction/ (Gemini API)                            │

│       │ structured JSON → data/processed/{id}.json   │

│       ▼                                              │

│  server/scripts/seed.js                              │

│       │ upsert → MongoDB Atlas                       │

└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐

│                 APPLICATION LAYER                    │

│                                                      │

│  client/ (React + Vite + Tailwind)                   │

│       │ natural language query / filters             │

│       ▼                                              │

│  server/api/ (Vercel Serverless Functions)           │

│       │ /api/universities                            │

│       │ /api/universities/[id]                       │

│       │ /api/search  (Gemini NLP → MongoDB)          │

│       │ /api/recommendations  (scoring algorithm)    │

│       ▼                                              │

│  MongoDB Atlas                                       │

└─────────────────────────────────────────────────────┘

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Vercel Serverless Functions |
| Database | MongoDB Atlas, Mongoose |
| AI / NLP | Google Gemini API (gemini-2.5-flash) |
| Scraping | Python, Playwright |
| Extraction | Python, Gemini REST API |
| Deployment | Vercel (frontend + serverless API) |

---

## Data Pipeline

The extraction pipeline is the technical core of this project:

1. **Scraper** (`scraper/scrape.py`) — Playwright fetches university admission pages with realistic browser fingerprinting to reduce bot detection. Supports a manual fallback: place copied admission text in `data/manual/{id}.txt` and the scraper skips the live fetch.

2. **Extractor** (`extraction/extract.py`) — sends raw page text to Gemini with a strict system instruction and `response_mime_type: "application/json"` for reliable structured output. Extracts: program name, degree level, deadline range, application fee, scholarship availability, and more. Sets `extraction_confidence` (high/medium/low) based on how much was found.

3. **Validator** (`extraction/validate.py`) — schema validation on every extracted record before it reaches the database.

4. **Seeder** (`server/scripts/seed.js`) — upserts processed records into MongoDB, preserving existing data.

---

## Recommendation Algorithm

The recommendation engine scores each university against a student profile:

| Criterion | Points |
|---|---|
| Degree level matches exactly | +30 |
| Country in student's preferred list | +20 |
| Application is free | +20 |
| Scholarship available | +15 |
| Program name contains student's field | +15 |

Universities are returned sorted by score descending. Maximum possible score: 100.

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas account (free tier)
- Google Gemini API key (free tier)

### Setup

```bash
# Clone
git clone https://github.com/IntikhabKhursheed/unigate-ai.git
cd unigate-ai

# Backend (Vercel serverless locally)
cd server
cp .env.example .env
# Add MONGODB_URI, GEMINI_API_KEY, GEMINI_MODEL to .env
npm install
npm run dev

# Frontend
cd ../client
cp .env.example .env
npm install
npm run dev
```

### Running the Data Pipeline

```bash
# Install Python dependencies
cd extraction
pip install -r requirements.txt
cp .env.example .env
# Add GEMINI_API_KEY and GEMINI_MODEL=gemini-2.5-flash to .env

# Install Playwright browser
cd ../scraper
pip install -r requirements.txt
playwright install chromium

# Run pipeline
python scraper/scrape.py --all
python extraction/extract.py --all
cd server && npm run seed
```

---

## Project Structure
unigate-ai/

├── client/                  # React frontend

│   └── src/

│       ├── pages/           # Search, Compare, Profile, Detail

│       └── components/      # UniversityCard, Filters, etc.

├── server/                  # Node.js backend

│   ├── api/                 # Vercel serverless functions

│   ├── src/

│   │   ├── models/          # Mongoose University schema

│   │   └── routes/          # Express routes (local dev)

│   └── scripts/             # seed.js

├── scraper/                 # Playwright scraping module

│   └── config/

│       └── universities.json

├── extraction/              # Gemini extraction module

│   ├── extract.py

│   ├── validate.py

│   └── generate_seed_data.py

└── data/

├── raw/                 # Scraped page text

├── processed/           # Structured JSON records

└── manual/              # Manual text fallback

---

## Deployment

Deployed as a Vercel monorepo — frontend as static/SSR and backend as serverless functions, both on Vercel free tier.

Environment variables required in Vercel dashboard:
- `MONGODB_URI`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

---

## Roadmap

- [ ] Replace seed data with fully live-scraped records as scraper coverage improves
- [ ] Add user accounts and saved shortlists
- [ ] Email alerts for deadline changes
- [ ] Expand to 500+ universities
- [ ] Add application requirement details (GRE, IELTS, GPA minimums)
- [ ] Mobile app (React Native)

---

## Author

**Intikhab Khursheed**
Frontend & Full Stack Developer | Peshawar, Pakistan
[LinkedIn](https://www.linkedin.com/in/intikhab-khursheed-afridi-028a51285/) · [GitHub](https://github.com/IntikhabKhursheed) · [Portfolio](https://intikhabkhurheed.netlify.app)

---

*Built as part of a portfolio for MS in Data Science / Artificial Intelligence applications.*

=== END README CONTENT ===

Save this as the root README.md, replacing the existing one completely.
Commit with message "Add professional README with architecture, pipeline docs, and deployment guide".
Push to origin/main.
