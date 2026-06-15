require("dns").setDefaultResultOrder("ipv4first");

const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const University = require("../src/models/University");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PROCESSED_DIR = path.join(__dirname, "..", "..", "data", "processed");

async function loadProcessedFiles() {
  const entries = await fs.readdir(PROCESSED_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.endsWith("_error.json"))
    .map((entry) => path.join(PROCESSED_DIR, entry.name));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function seedUniversities() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from server/.env");
  }

  const files = await loadProcessedFiles();
  if (files.length === 0) {
    console.log("No processed JSON files found. Nothing to seed.");
    return { inserted: 0, updated: 0, total: 0 };
  }

  await mongoose.connect(mongoUri);

  let inserted = 0;
  let updated = 0;

  for (const filePath of files) {
    const payload = await readJson(filePath);
    const universityId = payload.university_id;

    if (!universityId) {
      console.log(`Skipping ${path.basename(filePath)} because university_id is missing.`);
      continue;
    }

    const existing = await University.exists({ university_id: universityId });
    await University.findOneAndUpdate(
      { university_id: universityId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    if (existing) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  console.log(`Seed complete. Inserted: ${inserted}, Updated: ${updated}, Total processed: ${files.length}`);
  return { inserted, updated, total: files.length };
}

seedUniversities()
  .catch((error) => {
    const message = String(error?.message || error);
    if (message.includes("querySrv") || message.includes("mongodb+srv://") || message.includes("_mongodb._tcp")) {
      console.error("Seed failed: MongoDB SRV DNS resolution failed on this Windows/Node setup.");
      console.error("Try using a non-SRV connection string with mongodb:// and explicit hosts instead of mongodb+srv://.");
    }
    console.error("Seed failed:", message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
