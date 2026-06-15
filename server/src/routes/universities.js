const express = require("express");
const University = require("../models/University");

const router = express.Router();

// GET /universities?country=...&program=...&fee_type=...&deadline_from=...&deadline_to=...
router.get("/", async (req, res) => {
  try {
    const { country, program, fee_type, deadline_from, deadline_to } = req.query;
    const filters = {};

    if (country) filters.country = new RegExp(country, "i");
    if (program) filters.program_name = new RegExp(program, "i");
    if (fee_type === "free") filters.application_fee_required = false;
    if (fee_type === "paid") filters.application_fee_required = true;

    if (deadline_from || deadline_to) {
      // This works best when deadline dates are stored in ISO-8601 format.
      filters.application_deadline_end = {};
      if (deadline_from) filters.application_deadline_end.$gte = deadline_from;
      if (deadline_to) filters.application_deadline_end.$lte = deadline_to;
    }

    const universities = await University.find(filters).sort({ last_updated: -1 });
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

// GET /universities/:id
router.get("/:id", async (req, res) => {
  try {
    const university = await University.findOne({ university_id: req.params.id });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    res.json(university);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch university details" });
  }
});

module.exports = router;
