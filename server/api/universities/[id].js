const { connectDB } = require("../_lib/db");
const { handleOptions, sendJson } = require("../_lib/response");
const { University } = require("../_lib/university");

module.exports = async function universityDetailHandler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    await connectDB();
    const universityId = String(req.query.id || req.query.university_id || "").trim();

    if (!universityId) {
      return sendJson(res, 400, { error: "id is required" });
    }

    const university = await University.findOne({ university_id: universityId }).lean();

    if (!university) {
      return sendJson(res, 404, { error: "University not found" });
    }

    return sendJson(res, 200, university);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Failed to fetch university details",
      message: String(error?.message || error),
    });
  }
};
