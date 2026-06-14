const mongoose = require("mongoose");

// This schema mirrors the JSON produced by the extraction module.
const applicationFeeSchema = new mongoose.Schema(
  {
    required: { type: Boolean, default: false },
    amount: { type: Number, default: null },
    currency: { type: String, default: null },
  },
  { _id: false }
);

const universitySchema = new mongoose.Schema(
  {
    university_name: { type: String, required: true },
    country: { type: String, required: true },
    program_name: { type: String, required: true },
    degree_level: { type: String, required: true },
    application_deadline_start: { type: String, default: null },
    application_deadline_end: { type: String, default: null },
    application_fee: { type: applicationFeeSchema, required: true },
    scholarship_available: { type: Boolean, default: false },
    program_url: { type: String, required: true },
    last_updated: { type: String, required: true },
    confidence: { type: Number, default: 0 },
    status: { type: String, default: "todo" },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("University", universitySchema);
