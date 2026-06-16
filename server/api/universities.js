const { connectDB } = require("./_lib/db");
const { handleOptions, sendJson } = require("./_lib/response");
const { University, buildUniversityListQuery } = require("./_lib/university");

module.exports = async function universitiesHandler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    await connectDB();
    const filters = buildUniversityListQuery(req.query || {});
    const universities = await University.find(filters).sort({ extracted_at: -1 }).lean();
    return sendJson(res, 200, universities);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Failed to fetch universities",
      message: String(error?.message || error),
    });
  }
};
