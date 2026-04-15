// server/routes/riskPredict.js
// ─────────────────────────────────────────────────────────────────────────────
// Smart Academic Risk Prediction Engine — Decision Tree Classifier
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const Student = require("../model/student");

// ── Decision Tree Configuration ──────────────────────────────────────────────
const RISK_LEVELS = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

// ── Helper: Calculate Attendance % ───────────────────────────────────────────
function calcAttendancePct(attendance) {
  const entries = Object.entries(attendance || {});
  const total = entries.length;
  if (total === 0) return 0;
  const present = entries.filter(([, v]) => v === "P").length;
  return +((present / total) * 100).toFixed(2);
}

// ── Helper: Calculate Average Marks ──────────────────────────────────────────
function calcAverageMarks(marks) {
  if (!marks || marks.length === 0) return 0;
  const totalPct = marks.reduce((sum, m) => {
    return sum + (m.marksObtained / m.maxMarks) * 100;
  }, 0);
  return +(totalPct / marks.length).toFixed(2);
}

// ── Helper: Calculate Semester-wise Performance ──────────────────────────────
function calcSemesterPerformance(marks) {
  if (!marks || marks.length === 0) return [];
  const semMap = {};
  marks.forEach((m) => {
    const sem = m.semester || 1;
    if (!semMap[sem]) semMap[sem] = { total: 0, count: 0 };
    semMap[sem].total += (m.marksObtained / m.maxMarks) * 100;
    semMap[sem].count++;
  });
  return Object.entries(semMap)
    .map(([sem, data]) => ({
      semester: +sem,
      avgMarks: +(data.total / data.count).toFixed(2),
    }))
    .sort((a, b) => a.semester - b.semester);
}

// ──────────────────────────────────────────────────────────────────────────────
// 🧠 DECISION TREE CLASSIFIER
// ──────────────────────────────────────────────────────────────────────────────
// This implements a rule-based Decision Tree for student academic risk.
// Input features: attendance%, CGPA, averageMarks%
// Output: "high" | "medium" | "low"
//
// Tree structure:
//                    [attendance < 50?]
//                    /        \
//                  YES         NO
//               HIGH RISK   [attendance < 75?]
//                           /        \
//                         YES         NO
//                   [cgpa < 5?]     [cgpa < 5?]
//                   /       \       /       \
//                 YES       NO    YES       NO
//              HIGH RISK  [avg<40?] MEDIUM  [avg<60?]
//                         /    \           /     \
//                       YES    NO        YES     NO
//                    HIGH   MEDIUM    MEDIUM    LOW
// ──────────────────────────────────────────────────────────────────────────────
function predictRisk(attendancePct, cgpa, avgMarks) {
  // Decision node 1: Very low attendance is always high risk
  if (attendancePct < 50) {
    return {
      risk: RISK_LEVELS.HIGH,
      reason: "Attendance critically low (below 50%)",
      confidence: 0.95,
      decisionPath: ["attendance < 50% → HIGH RISK"],
    };
  }

  // Decision node 2: Below required attendance
  if (attendancePct < 75) {
    // Sub-node: Check CGPA
    if (cgpa < 5) {
      return {
        risk: RISK_LEVELS.HIGH,
        reason: "Low attendance (below 75%) combined with low CGPA (below 5.0)",
        confidence: 0.92,
        decisionPath: [
          "attendance < 75%",
          "cgpa < 5.0",
          "→ HIGH RISK",
        ],
      };
    }
    // Sub-node: Check marks
    if (avgMarks < 40) {
      return {
        risk: RISK_LEVELS.HIGH,
        reason: "Low attendance (below 75%) with failing marks (below 40%)",
        confidence: 0.88,
        decisionPath: [
          "attendance < 75%",
          "cgpa ≥ 5.0",
          "avgMarks < 40%",
          "→ HIGH RISK",
        ],
      };
    }
    return {
      risk: RISK_LEVELS.MEDIUM,
      reason: "Attendance below required 75% — needs improvement",
      confidence: 0.82,
      decisionPath: [
        "attendance < 75%",
        "cgpa ≥ 5.0",
        "avgMarks ≥ 40%",
        "→ MEDIUM RISK",
      ],
    };
  }

  // Decision node 3: Good attendance (≥75%), check academic performance
  if (cgpa < 5) {
    return {
      risk: RISK_LEVELS.MEDIUM,
      reason: "Good attendance but CGPA is low (below 5.0)",
      confidence: 0.78,
      decisionPath: [
        "attendance ≥ 75%",
        "cgpa < 5.0",
        "→ MEDIUM RISK",
      ],
    };
  }

  if (avgMarks < 60) {
    return {
      risk: RISK_LEVELS.MEDIUM,
      reason: "Decent CGPA but average marks below 60% — monitor closely",
      confidence: 0.72,
      decisionPath: [
        "attendance ≥ 75%",
        "cgpa ≥ 5.0",
        "avgMarks < 60%",
        "→ MEDIUM RISK",
      ],
    };
  }

  // Leaf node: All good
  return {
    risk: RISK_LEVELS.LOW,
    reason: "Good attendance, CGPA and marks — performing well",
    confidence: 0.88,
    decisionPath: [
      "attendance ≥ 75%",
      "cgpa ≥ 5.0",
      "avgMarks ≥ 60%",
      "→ LOW RISK",
    ],
  };
}

// ── Build full prediction for a student ──────────────────────────────────────
function buildPrediction(student) {
  const attendancePct = calcAttendancePct(student.attandance);
  const avgMarks = calcAverageMarks(student.marks);
  const cgpa = student.cgpa || 0;
  const semesterPerformance = calcSemesterPerformance(student.marks);

  const prediction = predictRisk(attendancePct, cgpa, avgMarks);

  // Attendance details
  const entries = Object.entries(student.attandance || {});
  const totalClasses = entries.length;
  const presentCount = entries.filter(([, v]) => v === "P").length;

  return {
    studentId: student.id,
    name: student.name,
    email: student.email,
    department: student.department || "N/A",
    admissionYear: student.admission_year,
    cgpa,
    attendancePct,
    avgMarks,
    totalClasses,
    presentCount,
    absentCount: totalClasses - presentCount,
    totalMarksEntries: (student.marks || []).length,
    semesterPerformance,
    ...prediction,
  };
}

// ── GET /api/risk/predict/:studentId ─────────────────────────────────────────
// Predict risk for a single student
router.get("/predict/:studentId", async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    const prediction = buildPrediction(student);
    return res.json(prediction);
  } catch (err) {
    console.error("Risk prediction error:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

// ── GET /api/risk/predict ────────────────────────────────────────────────────
// Predict risk for ALL students + summary
router.get("/predict", async (req, res) => {
  try {
    const students = await Student.find();
    const predictions = students.map(buildPrediction);

    // Sort by risk: high first, then medium, then low
    const riskOrder = { high: 0, medium: 1, low: 2 };
    predictions.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

    const highCount = predictions.filter((p) => p.risk === "high").length;
    const mediumCount = predictions.filter((p) => p.risk === "medium").length;
    const lowCount = predictions.filter((p) => p.risk === "low").length;

    const summary = {
      totalStudents: predictions.length,
      highRisk: highCount,
      mediumRisk: mediumCount,
      lowRisk: lowCount,
      averageAttendance: predictions.length
        ? +(
            predictions.reduce((acc, p) => acc + p.attendancePct, 0) /
            predictions.length
          ).toFixed(2)
        : 0,
      averageCGPA: predictions.length
        ? +(
            predictions.reduce((acc, p) => acc + p.cgpa, 0) /
            predictions.length
          ).toFixed(2)
        : 0,
      averageMarks: predictions.length
        ? +(
            predictions.reduce((acc, p) => acc + p.avgMarks, 0) /
            predictions.length
          ).toFixed(2)
        : 0,
    };

    return res.json({ summary, predictions });
  } catch (err) {
    console.error("Risk prediction error:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

// ── GET /api/risk/dashboard ──────────────────────────────────────────────────
// Dashboard-specific summary stats
router.get("/dashboard", async (req, res) => {
  try {
    const students = await Student.find();
    const predictions = students.map(buildPrediction);

    const highRisk = predictions.filter((p) => p.risk === "high");
    const mediumRisk = predictions.filter((p) => p.risk === "medium");
    const lowRisk = predictions.filter((p) => p.risk === "low");

    // Attendance distribution buckets
    const attendanceBuckets = {
      "0-25%": 0,
      "25-50%": 0,
      "50-75%": 0,
      "75-90%": 0,
      "90-100%": 0,
    };
    predictions.forEach((p) => {
      if (p.attendancePct < 25) attendanceBuckets["0-25%"]++;
      else if (p.attendancePct < 50) attendanceBuckets["25-50%"]++;
      else if (p.attendancePct < 75) attendanceBuckets["50-75%"]++;
      else if (p.attendancePct < 90) attendanceBuckets["75-90%"]++;
      else attendanceBuckets["90-100%"]++;
    });

    // Department-wise stats
    const deptMap = {};
    predictions.forEach((p) => {
      const dept = p.department || "Unknown";
      if (!deptMap[dept]) deptMap[dept] = { total: 0, high: 0, medium: 0, low: 0 };
      deptMap[dept].total++;
      deptMap[dept][p.risk]++;
    });

    return res.json({
      summary: {
        totalStudents: predictions.length,
        highRisk: highRisk.length,
        mediumRisk: mediumRisk.length,
        lowRisk: lowRisk.length,
        averageAttendance: predictions.length
          ? +(predictions.reduce((a, p) => a + p.attendancePct, 0) / predictions.length).toFixed(2)
          : 0,
        averageCGPA: predictions.length
          ? +(predictions.reduce((a, p) => a + p.cgpa, 0) / predictions.length).toFixed(2)
          : 0,
        averageMarks: predictions.length
          ? +(predictions.reduce((a, p) => a + p.avgMarks, 0) / predictions.length).toFixed(2)
          : 0,
      },
      attendanceBuckets,
      departmentStats: deptMap,
      highRiskStudents: highRisk,
      alerts: highRisk.map((s) => ({
        studentId: s.studentId,
        name: s.name,
        department: s.department,
        risk: s.risk,
        reason: s.reason,
        attendancePct: s.attendancePct,
        cgpa: s.cgpa,
        avgMarks: s.avgMarks,
        message: `⚠ Warning: ${s.name} is at High Academic Risk. Immediate faculty intervention required.`,
      })),
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ error: "Dashboard data failed" });
  }
});

module.exports = router;
