const express = require("express");
const University = require("../models/University");

const router = express.Router();

// GET /universities?country=...&program=...&degree_level=...&fee_type=...&scholarship_available=...&deadline_from=...&deadline_to=...
router.get("/", async (req, res) => {
  try {
    const {
      country,
      program,
      degree_level,
      fee_type,
      scholarship_available,
      deadline_from,
      deadline_to,
    } = req.query;
    const filters = {};

    if (country) filters.country = new RegExp(country, "i");
    if (program) filters.program_name = new RegExp(program, "i");
    if (degree_level) filters.degree_level = new RegExp(degree_level, "i");
    if (fee_type === "free") filters.application_fee_required = false;
    if (fee_type === "paid") filters.application_fee_required = true;
    if (scholarship_available === "true") filters.scholarship_available = true;
    if (scholarship_available === "false") filters.scholarship_available = false;

    if (deadline_from || deadline_to) {
      filters.application_deadline_end = {};
      if (deadline_from) filters.application_deadline_end.$gte = deadline_from;
      if (deadline_to) filters.application_deadline_end.$lte = deadline_to;
    }

    const universities = await University.find(filters).sort({ extracted_at: -1 });
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
