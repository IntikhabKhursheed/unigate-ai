const { connectDB } = require("./_lib/db");
const { handleOptions, sendJson } = require("./_lib/response");
const { University, scoreUniversity } = require("./_lib/university");

module.exports = async function recommendationsHandler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    await connectDB();
    const { field = "", degree_level = "", max_budget = null, preferred_countries = [] } = req.body || {};

    const universities = await University.find({}).sort({ extracted_at: -1 }).lean();
    const scored = universities
      .map((university) => ({
        score: scoreUniversity(university, {
          field,
          degree_level,
          preferred_countries,
        }),
        ...university,
      }))
      .sort((a, b) => b.score - a.score);

    return sendJson(res, 200, {
      profile: {
        field,
        degree_level,
        max_budget,
        preferred_countries,
      },
      results: scored,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Failed to generate recommendations",
      message: String(error?.message || error),
    });
  }
};
