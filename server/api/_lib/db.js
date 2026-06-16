require("dns").setDefaultResultOrder("ipv4first");

const mongoose = require("mongoose");

const MONGOOSE_CACHE_KEY = "mongoose";

function getCachedConnection() {
  if (!global[MONGOOSE_CACHE_KEY]) {
    global[MONGOOSE_CACHE_KEY] = { conn: null, promise: null };
  }

  return global[MONGOOSE_CACHE_KEY];
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from the environment.");
  }

  const cached = getCachedConnection();
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((client) => client);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = {
  connectDB,
  mongoose,
};
