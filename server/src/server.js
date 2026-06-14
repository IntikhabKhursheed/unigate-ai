const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

const universityRoutes = require("./routes/universities");
const searchRoutes = require("./routes/search");
const recommendationRoutes = require("./routes/recommendations");
const { connectDatabase } = require("./config/database");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check so we can verify the API boots successfully.
app.get("/", (req, res) => {
  res.json({
    message: "UniGate server is running",
    status: "ok",
  });
});

app.use("/universities", universityRoutes);
app.use("/", searchRoutes);
app.use("/", recommendationRoutes);

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`UniGate API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
