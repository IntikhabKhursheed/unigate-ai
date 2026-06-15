const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    university_id: { type: String, required: true, unique: true, index: true },
    university_name: { type: String, required: true },
    country: { type: String, required: true },
    program_name: { type: String, required: true },
    degree_level: { type: String, required: true },
    application_deadline_start: { type: String, default: null },
    application_deadline_end: { type: String, default: null },
    application_fee_required: { type: Boolean, required: true },
    application_fee_amount: { type: Number, default: null },
    application_fee_currency: { type: String, default: null },
    scholarship_available: { type: Boolean, default: false },
    scholarship_details: { type: String, default: null },
    program_url: { type: String, required: true },
    extracted_at: { type: String, required: true },
    source_url: { type: String, default: null },
    extraction_confidence: { type: String, required: true },
    status: { type: String, default: "todo" },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("University", universitySchema);
