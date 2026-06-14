const express = require("express");
const University = require("../models/University");

const router = express.Router();

router.get("/recommendations", async (req, res) => {
  try {
    const { field, degree_level, budget } = req.query;

    // TODO: Replace this simple placeholder with content-based ranking.
    const universities = await University.find({}).limit(20);

    res.json({
      profile: { field, degree_level, budget },
      recommendations: universities,
      message: "TODO: add ranking logic based on student profile.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router;
