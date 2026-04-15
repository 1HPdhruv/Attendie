// server/routes/predict.js
// ─────────────────────────────────────────────────────────────────────────────
// Attendance Prediction Engine
// Plug this into server/index.js:
//   const predictRoutes = require("./routes/predict");
//   app.use("/api/predict", predictRoutes);
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const Student = require("../models/Student");       // your existing Mongoose model
const verifyToken = require("../middleware/auth");  // your existing JWT middleware

// ── Config ────────────────────────────────────────────────────────────────────
const TOTAL_EXPECTED_CLASSES = 90; // Change this to match your semester total
const REQUIRED_ATTENDANCE_PCT = 75; // 75% minimum threshold
const RISK_DAY_THRESHOLD = 0.4;     // Flag a day if absent >40% of the time
const RECENT_WINDOW = 10;           // How many recent classes to check for trend

// ── Core Prediction Function ──────────────────────────────────────────────────
function analyzeAttendance(attendance = {}) {
  const entries = Object.entries(attendance); // [["2024-01-15", "P"], ...]
  const total = entries.length;
  const present = entries.filter(([, v]) => v === "P").length;
  const currentPct = total > 0 ? (present / total) * 100 : 0;

  // ── Day-of-week absence pattern ──────────────────────────────────────────
  const dayAbsenceCount = [0, 0, 0, 0, 0, 0, 0];
  const dayTotal        = [0, 0, 0, 0, 0, 0, 0];

  entries.forEach(([date, status]) => {
    const day = new Date(date).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    dayTotal[day]++;
    if (status === "A") dayAbsenceCount[day]++;
  });

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const riskDays = DAY_NAMES.filter(
    (_, i) =>
      dayTotal[i] > 0 &&
      dayAbsenceCount[i] / dayTotal[i] > RISK_DAY_THRESHOLD
  );

  // ── Recent trend (last N classes) ────────────────────────────────────────
  // Sort entries by date so "recent" is actually the latest ones
  const sorted = [...entries].sort(([a], [b]) => new Date(a) - new Date(b));
  const recent = sorted.slice(-RECENT_WINDOW);
  const recentPresent = recent.filter(([, v]) => v === "P").length;
  const recentPct =
    recent.length > 0 ? (recentPresent / recent.length) * 100 : currentPct;

  const trend =
    recentPct > currentPct + 2
      ? "improving"
      : recentPct < currentPct - 2
      ? "declining"
      : "stable";

  // ── How many absences can the student still afford? ──────────────────────
  const remainingClasses = Math.max(0, TOTAL_EXPECTED_CLASSES - total);
  const requiredPresent =
    Math.ceil((REQUIRED_ATTENDANCE_PCT / 100) * TOTAL_EXPECTED_CLASSES) - present;
  const canAffordAbsences = Math.max(0, remainingClasses - requiredPresent);

  // ── Projected final % using recent trend as the going-forward rate ───────
  const projectedFinal =
    total > 0
      ? ((present + (recentPct / 100) * remainingClasses) /
          TOTAL_EXPECTED_CLASSES) *
        100
      : null;

  return {
    currentPct:      +currentPct.toFixed(2),
    recentPct:       +recentPct.toFixed(2),
    trend,                                   // "improving" | "declining" | "stable"
    riskDays,                                // e.g. ["Mon", "Fri"]
    canAffordAbsences,                       // integer
    projectedFinal:
      projectedFinal !== null ? +projectedFinal.toFixed(2) : null,
    atRisk:          projectedFinal !== null && projectedFinal < REQUIRED_ATTENDANCE_PCT,
    totalClasses:    total,
    presentCount:    present,
    absentCount:     total - present,
    remainingClasses,
  };
}

// ── GET /api/predict/:studentId ───────────────────────────────────────────────
// Returns prediction for a single student. Accessible by that student or teacher.
router.get("/:studentId", verifyToken, async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const prediction = analyzeAttendance(student.attendance);

    return res.json({
      studentId:  student.studentId,
      name:       student.name,
      ...prediction,
    });
  } catch (err) {
    console.error("Prediction error:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

// ── GET /api/predict ──────────────────────────────────────────────────────────
// Returns predictions for ALL students. Teacher only.
// Sorted by projectedFinal ascending (most at-risk first).
router.get("/", verifyToken, async (req, res) => {
  try {
    // Optional: add role check here if you store role in JWT
    // if (req.user.role !== "teacher") return res.status(403).json({ error: "Forbidden" });

    const students = await Student.find();

    const predictions = students.map((s) => ({
      studentId:  s.studentId,
      name:       s.name,
      ...analyzeAttendance(s.attendance),
    }));

    // Sort: lowest projected % first (most at-risk at top)
    predictions.sort(
      (a, b) => (a.projectedFinal ?? 100) - (b.projectedFinal ?? 100)
    );

    const summary = {
      total:          predictions.length,
      atRiskCount:    predictions.filter((p) => p.atRisk).length,
      safeCount:      predictions.filter((p) => !p.atRisk).length,
      averageCurrent: predictions.length
        ? +(
            predictions.reduce((acc, p) => acc + p.currentPct, 0) /
            predictions.length
          ).toFixed(2)
        : 0,
    };

    return res.json({ summary, predictions });
  } catch (err) {
    console.error("Prediction error:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

module.exports = router;