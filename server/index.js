require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authenticate = require("./middelware/authentication");
const { notFoundHandler, errorHandler } = require("./middelware/errorHandler");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const studentsRoutes = require("./routes/studentsRoutes");

const app = express();

const port = process.env.PORT || 5000;
const dbUrl = process.env.DB_URL || process.env.MONGODB;
const clientUrl = process.env.CLIENT_URL;

if (!dbUrl) {
  throw new Error("DB_URL is not configured");
}

mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
  });

app.use(
  cors({
    origin: clientUrl
      ? clientUrl.split(",").map((item) => item.trim())
      : true,
    credentials: true,
  })
);
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", authenticate, studentsRoutes);

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Attendie API is running" });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
