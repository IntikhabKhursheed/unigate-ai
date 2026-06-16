const { GoogleGenerativeAI } = require("@google/generative-ai");
const { connectDB } = require("./_lib/db");
const { handleOptions, sendJson } = require("./_lib/response");
const { University, buildKeywordFallbackQuery } = require("./_lib/university");

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

function cleanExtractedFilters(rawFilters) {
  const filters = {};

  if (rawFilters && typeof rawFilters === "object") {
    const { country, degree_level, application_fee_required, scholarship_available, program_name } = rawFilters;

    if (typeof country === "string" && country.trim()) {
      filters.country = new RegExp(String(country.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (typeof degree_level === "string" && degree_level.trim()) {
      filters.degree_level = degree_level.trim();
    }

    if (typeof application_fee_required === "boolean") {
      filters.application_fee_required = application_fee_required;
    }

    if (typeof scholarship_available === "boolean") {
      filters.scholarship_available = scholarship_available;
    }

    if (typeof program_name === "string" && program_name.trim()) {
      filters.program_name = new RegExp(String(program_name.trim()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
  }

  return filters;
}

async function parseSearchQuery(query) {
  const model = buildGeminiClient();
  if (!model) {
    throw new Error("Gemini API key not configured.");
  }

  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `Parse this natural language search query into JSON filters only: ${query}` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const text = response.response.text();
  return JSON.parse(text);
}

async function runKeywordFallback(query) {
  const tokens = buildKeywordFallbackQuery(query);

  if (tokens.length === 0) {
    return University.find({}).sort({ extracted_at: -1 }).lean();
  }

  return University.find({ $or: tokens.flatMap((clause) => clause.$or) })
    .sort({ extracted_at: -1 })
    .lean();
}

module.exports = async function searchHandler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    await connectDB();
    const query = String(req.body?.query || "").trim();
    if (!query) {
      return sendJson(res, 400, { error: "query is required" });
    }

    try {
      const parsed = await parseSearchQuery(query);
      const extractedFilters = cleanExtractedFilters(parsed);
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

      const results = await University.find(dbQuery).sort({ extracted_at: -1 }).lean();
      return sendJson(res, 200, {
        query,
        mode: "gemini",
        filters: {
          country: typeof parsed.country === "string" ? parsed.country : null,
          degree_level: typeof parsed.degree_level === "string" ? parsed.degree_level : null,
          application_fee_required:
            typeof parsed.application_fee_required === "boolean" ? parsed.application_fee_required : null,
          scholarship_available: typeof parsed.scholarship_available === "boolean" ? parsed.scholarship_available : null,
          program_name: typeof parsed.program_name === "string" ? parsed.program_name : null,
        },
        results,
      });
    } catch (error) {
      const results = await runKeywordFallback(query);
      return sendJson(res, 200, {
        query,
        mode: "keyword_fallback",
        filters: null,
        results,
      });
    }
  } catch (error) {
    const results = await runKeywordFallback(String(req.body?.query || ""));
    return sendJson(res, 200, {
      query: req.body?.query || "",
      mode: "keyword_fallback",
      filters: null,
      results,
    });
  }
};
