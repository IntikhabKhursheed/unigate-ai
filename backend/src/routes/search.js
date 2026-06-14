const express = require("express");

const router = express.Router();

router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    // TODO: Send the natural language query to Gemini and convert it into
    // structured filters such as country, fee type, deadlines, and degree level.
    res.json({
      query,
      filters: {},
      message: "TODO: implement Gemini-powered query parsing.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to parse search query" });
  }
});

module.exports = router;
