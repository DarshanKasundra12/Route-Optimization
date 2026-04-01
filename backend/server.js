const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/RouteDB")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/api/parcels", require("./routes/parcelRoutes"));
app.use("/api/routes", require("./routes/routeRoutes"));
app.use("/api/warehouses", require("./routes/warehouseRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: err.message,
  });
});

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Startup Diagnostics
    console.log("\n--- SERVICE DIAGNOSTICS ---");

    // 1. OSRM Check
    const osrmService = require("./services/osrmService");
    const osrmHealth = await osrmService.healthCheck();
    console.log(
      `OSRM SERVICE: ${osrmHealth ? "✅ ONLINE" : "❌ OFFLINE"} (${process.env.OSRM_HOST || "http://localhost:5000"})`,
    );

    // 2. VROOM Check
    try {
      const axios = require("axios");
      const vroomUrl = process.env.VROOM_HOST || "http://localhost:3000";
      const vroomHealth = await axios
        .get(`${vroomUrl}/health`)
        .catch(() => null);
      console.log(
        `VROOM SERVICE: ${vroomHealth ? "✅ ONLINE" : "❌ OFFLINE"} (${vroomUrl})`,
      );
    } catch (e) {
      console.log("VROOM SERVICE: ❌ OFFLINE");
    }
    console.log("---------------------------\n");
  });
}

module.exports = { app };
