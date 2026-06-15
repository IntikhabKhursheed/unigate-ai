require("dns").setDefaultResultOrder("ipv4first");

const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

const universityRoutes = require("./routes/universities");
const aiRoutes = require("./routes/ai");
const { connectDatabase } = require("./config/database");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Health check so we can verify the API boots successfully.
app.get("/", (req, res) => {
  res.json({
    message: "UniGate server is running",
    status: "ok",
  });
});

app.use("/universities", universityRoutes);
app.use("/", aiRoutes);

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`UniGate API listening on port ${port}`);
    });
  } catch (error) {
    const message = String(error?.message || error);
    if (message.includes("querySrv") || message.includes("mongodb+srv://") || message.includes("_mongodb._tcp")) {
      console.error("Failed to start server: MongoDB SRV DNS resolution failed on this Windows/Node setup.");
      console.error("Try using a non-SRV connection string with mongodb:// and explicit hosts instead of mongodb+srv://.");
    }
    console.error("Failed to start server:", message);
    process.exit(1);
  }
}

startServer();
