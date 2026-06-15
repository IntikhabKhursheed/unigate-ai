const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const University = require("../models/University");

const router = express.Router();

function buildGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: [
      "You are a query parser for a university admissions search engine.",
      "Convert the user's natural language query into JSON filters matching these fields only:",
      "country, degree_level, application_fee_required, scholarship_available, program_name.",
      "Return ONLY valid JSON, no markdown, no extra text.",
      "Use null for any filter you cannot confidently infer.",
      'Example: "PhD programs in Germany with no application fee" -> {"country":"Germany","degree_level":"PhD","application_fee_required":false}',
    ].join(" "),
  });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildKeywordQuery(query) {
  const tokens = String(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

  return tokens
    .map((token) => ({
      $or: [
        { university_name: new RegExp(escapeRegex(token), "i") },
        { country: new RegExp(escapeRegex(token), "i") },
        { program_name: new RegExp(escapeRegex(token), "i") },
      ],
    }))
    .flatMap((clause) => clause.$or);
}

function cleanExtractedFilters(rawFilters) {
  const filters = {};
  if (rawFilters && typeof rawFilters === "object") {
    const { country, degree_level, application_fee_required, scholarship_available, program_name } = rawFilters;

    if (typeof country === "string" && country.trim()) filters.country = new RegExp(escapeRegex(country.trim()), "i");
    if (typeof degree_level === "string" && degree_level.trim()) filters.degree_level = degree_level.trim();
    if (typeof application_fee_required === "boolean") filters.application_fee_required = application_fee_required;
    if (typeof scholarship_available === "boolean") filters.scholarship_available = scholarship_available;
    if (typeof program_name === "string" && program_name.trim()) {
      filters.program_name = new RegExp(escapeRegex(program_name.trim()), "i");
    }
  }
  return filters;
}

async function parseSearchQuery(query) {
  const model = buildGeminiClient();
  if (!model) {
    throw new Error("Gemini API key not configured.");
  }

  const prompt = `Parse this natural language search query into JSON filters only: ${query}`;
  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const text = response.response.text();
  return JSON.parse(text);
}

async function runKeywordFallback(query) {
  const clauses = buildKeywordQuery(query);
  if (clauses.length === 0) {
    return University.find({}).sort({ extracted_at: -1 });
  }
  return University.find({ $or: clauses }).sort({ extracted_at: -1 });
}

// POST /search
// Natural language search is first parsed by Gemini into structured filters.
// If Gemini fails, we fall back to a simple keyword search across university_name,
// country, and program_name so the endpoint still returns useful results.
router.post("/search", async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    let mode = "gemini";
    let extractedFilters = {};
    let responseFilters = {};
    try {
      const parsed = await parseSearchQuery(query);
      responseFilters = {
        country: typeof parsed.country === "string" ? parsed.country : null,
        degree_level: typeof parsed.degree_level === "string" ? parsed.degree_level : null,
        application_fee_required:
          typeof parsed.application_fee_required === "boolean" ? parsed.application_fee_required : null,
        scholarship_available: typeof parsed.scholarship_available === "boolean" ? parsed.scholarship_available : null,
        program_name: typeof parsed.program_name === "string" ? parsed.program_name : null,
      };
      extractedFilters = cleanExtractedFilters(parsed);
    } catch (error) {
      mode = "keyword_fallback";
      const fallbackResults = await runKeywordFallback(query);
      return res.json({
        query,
        mode,
        filters: null,
        results: fallbackResults,
      });
    }

    const dbQuery = {};
    if (extractedFilters.country) dbQuery.country = extractedFilters.country;
    if (extractedFilters.degree_level) dbQuery.degree_level = extractedFilters.degree_level;
    if (typeof extractedFilters.application_fee_required === "boolean") {
      dbQuery.application_fee_required = extractedFilters.application_fee_required;
    }
    if (typeof extractedFilters.scholarship_available === "boolean") {
      dbQuery.scholarship_available = extractedFilters.scholarship_available;
    }
    if (extractedFilters.program_name) dbQuery.program_name = extractedFilters.program_name;

    const results = await University.find(dbQuery).sort({ extracted_at: -1 });
    res.json({
      query,
      mode,
      filters: responseFilters,
      results,
    });
  } catch (error) {
    const fallbackResults = await runKeywordFallback(String(req.body?.query || ""));
    res.json({
      query: req.body?.query || "",
      mode: "keyword_fallback",
      filters: null,
      results: fallbackResults,
    });
  }
});

// POST /recommendations
// Recommendation algorithm:
// - +30 points when the university degree_level exactly matches the student's preference
// - +20 points when the university country is in preferred_countries
// - +20 points when application_fee_required is false
// - +15 points when scholarship_available is true
// - +15 points when program_name contains the student's field text (case-insensitive)
// This scoring is intentionally simple and transparent so it can be explained in the project writeup.
router.post("/recommendations", async (req, res) => {
  try {
    const { field = "", degree_level = "", max_budget = null, preferred_countries = [] } = req.body || {};

    const universities = await University.find({}).sort({ extracted_at: -1 });
    const preferredSet = Array.isArray(preferred_countries) ? new Set(preferred_countries.map((value) => String(value).toLowerCase())) : new Set();
    const fieldNeedle = String(field).trim().toLowerCase();
    const hasPreferredCountries = preferredSet.size > 0;

    const scored = universities.map((university) => {
      let score = 0;

      if (String(university.degree_level || "").toLowerCase() === String(degree_level || "").toLowerCase()) {
        score += 30;
      }

      if (hasPreferredCountries && preferredSet.has(String(university.country || "").toLowerCase())) {
        score += 20;
      }

      if (university.application_fee_required === false) {
        score += 20;
      }

      if (university.scholarship_available === true) {
        score += 15;
      }

      if (fieldNeedle && String(university.program_name || "").toLowerCase().includes(fieldNeedle)) {
        score += 15;
      }

      return {
        score,
        university,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    res.json({
      profile: {
        field,
        degree_level,
        max_budget,
        preferred_countries,
      },
      results: scored.map((entry) => ({
        score: entry.score,
        ...entry.university.toObject(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router;
