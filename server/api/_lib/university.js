const University = require("../../src/models/University");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBooleanFilter(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
}

function buildUniversityListQuery(query = {}) {
  const filters = {};

  const country = typeof query.country === "string" ? query.country.trim() : "";
  const program = typeof query.program === "string" ? query.program.trim() : "";
  const degreeLevel = typeof query.degree_level === "string" ? query.degree_level.trim() : "";
  const feeType = typeof query.fee_type === "string" ? query.fee_type.trim().toLowerCase() : "";
  const applicationFeeRequired = parseBooleanFilter(query.application_fee_required);
  const scholarshipAvailable = parseBooleanFilter(query.scholarship_available);

  if (country) filters.country = new RegExp(escapeRegex(country), "i");
  if (program) filters.program_name = new RegExp(escapeRegex(program), "i");
  if (degreeLevel) filters.degree_level = new RegExp(escapeRegex(degreeLevel), "i");

  if (feeType === "free") filters.application_fee_required = false;
  if (feeType === "paid") filters.application_fee_required = true;
  if (typeof applicationFeeRequired === "boolean") filters.application_fee_required = applicationFeeRequired;
  if (typeof scholarshipAvailable === "boolean") filters.scholarship_available = scholarshipAvailable;

  const deadlineFrom = typeof query.deadline_from === "string" ? query.deadline_from.trim() : "";
  const deadlineTo = typeof query.deadline_to === "string" ? query.deadline_to.trim() : "";

  if (deadlineFrom || deadlineTo) {
    filters.application_deadline_end = {};
    if (deadlineFrom) filters.application_deadline_end.$gte = deadlineFrom;
    if (deadlineTo) filters.application_deadline_end.$lte = deadlineTo;
  }

  return filters;
}

function escapeClauseToken(token) {
  return new RegExp(escapeRegex(token), "i");
}

function buildKeywordFallbackQuery(queryText) {
  const tokens = String(queryText)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

  const clauses = [];
  for (const token of tokens) {
    clauses.push({
      $or: [
        { university_name: escapeClauseToken(token) },
        { country: escapeClauseToken(token) },
        { program_name: escapeClauseToken(token) },
      ],
    });
  }

  return clauses;
}

function scoreUniversity(university, profile = {}) {
  let score = 0;
  const degreeLevel = String(profile.degree_level || "").trim().toLowerCase();
  const preferredCountries = Array.isArray(profile.preferred_countries)
    ? profile.preferred_countries.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    : [];
  const fieldNeedle = String(profile.field || "").trim().toLowerCase();

  if (degreeLevel && String(university.degree_level || "").trim().toLowerCase() === degreeLevel) {
    score += 30;
  }

  if (preferredCountries.length > 0 && preferredCountries.includes(String(university.country || "").trim().toLowerCase())) {
    score += 20;
  }

  if (university.application_fee_required === false) {
    score += 20;
  }

  if (university.scholarship_available === true) {
    score += 15;
  }

  if (fieldNeedle && String(university.program_name || "").trim().toLowerCase().includes(fieldNeedle)) {
    score += 15;
  }

  return score;
}

module.exports = {
  University,
  buildKeywordFallbackQuery,
  buildUniversityListQuery,
  parseBooleanFilter,
  scoreUniversity,
};
