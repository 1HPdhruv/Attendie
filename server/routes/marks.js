// server/routes/marks.js
// ─────────────────────────────────────────────────────────────────────────────
// Marks Management System — CRUD operations for student marks
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const Student = require("../model/student");

// ── POST /api/marks/:studentId — Add marks for a student ─────────────────────
router.post("/:studentId", async (req, res) => {
  try {
    const { subject, examType, marksObtained, maxMarks, semester } = req.body;

    if (!subject || marksObtained === undefined || maxMarks === undefined) {
      return res.status(400).json({ error: "subject, marksObtained, and maxMarks are required" });
    }

    if (marksObtained < 0 || marksObtained > maxMarks) {
      return res.status(400).json({ error: "marksObtained must be between 0 and maxMarks" });
    }

    const student = await Student.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    student.marks.push({
      subject,
      examType: examType || "internal",
      marksObtained,
      maxMarks,
      semester: semester || 1,
    });

    await student.save();

    return res.json({
      message: "Marks added successfully",
      marks: student.marks,
    });
  } catch (err) {
    console.error("Add marks error:", err);
    return res.status(500).json({ error: "Failed to add marks" });
  }
});

// ── GET /api/marks/:studentId — Get all marks for a student ──────────────────
router.get("/:studentId", async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const marks = student.marks || [];
    const avgPct = marks.length
      ? +(marks.reduce((s, m) => s + (m.marksObtained / m.maxMarks) * 100, 0) / marks.length).toFixed(2)
      : 0;

    const semMap = {};
    marks.forEach((m) => {
      const sem = m.semester || 1;
      if (!semMap[sem]) semMap[sem] = { marks: [], total: 0, count: 0 };
      semMap[sem].marks.push(m);
      semMap[sem].total += (m.marksObtained / m.maxMarks) * 100;
      semMap[sem].count++;
    });

    const semesters = Object.entries(semMap)
      .map(([sem, data]) => ({
        semester: +sem,
        avgPct: +(data.total / data.count).toFixed(2),
        marks: data.marks,
      }))
      .sort((a, b) => a.semester - b.semester);

    return res.json({
      studentId: student.id,
      name: student.name,
      totalEntries: marks.length,
      averagePercentage: avgPct,
      semesters,
      marks,
    });
  } catch (err) {
    console.error("Get marks error:", err);
    return res.status(500).json({ error: "Failed to get marks" });
  }
});

// ── PUT /api/marks/:studentId/cgpa — Update CGPA ─────────────────────────────
// IMPORTANT: This route MUST be defined BEFORE /:studentId/:markId
// otherwise Express matches "cgpa" as a markId parameter.
router.put("/:studentId/cgpa", async (req, res) => {
  try {
    const { cgpa } = req.body;
    if (cgpa === undefined || cgpa < 0 || cgpa > 10) {
      return res.status(400).json({ error: "CGPA must be between 0 and 10" });
    }

    const student = await Student.findOneAndUpdate(
      { id: req.params.studentId },
      { cgpa },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.json({
      message: "CGPA updated successfully",
      studentId: student.id,
      cgpa: student.cgpa,
    });
  } catch (err) {
    console.error("Update CGPA error:", err);
    return res.status(500).json({ error: "Failed to update CGPA" });
  }
});

// ── PUT /api/marks/:studentId/:markId — Update a mark entry ──────────────────
router.put("/:studentId/:markId", async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const mark = student.marks.id(req.params.markId);
    if (!mark) {
      return res.status(404).json({ error: "Mark entry not found" });
    }

    const { subject, examType, marksObtained, maxMarks, semester } = req.body;
    if (subject !== undefined) mark.subject = subject;
    if (examType !== undefined) mark.examType = examType;
    if (marksObtained !== undefined) mark.marksObtained = marksObtained;
    if (maxMarks !== undefined) mark.maxMarks = maxMarks;
    if (semester !== undefined) mark.semester = semester;

    await student.save();

    return res.json({
      message: "Mark updated successfully",
      mark,
    });
  } catch (err) {
    console.error("Update marks error:", err);
    return res.status(500).json({ error: "Failed to update marks" });
  }
});

// ── DELETE /api/marks/:studentId/:markId — Delete a mark entry ───────────────
router.delete("/:studentId/:markId", async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const mark = student.marks.id(req.params.markId);
    if (!mark) {
      return res.status(404).json({ error: "Mark entry not found" });
    }

    mark.deleteOne();
    await student.save();

    return res.json({ message: "Mark deleted successfully" });
  } catch (err) {
    console.error("Delete marks error:", err);
    return res.status(500).json({ error: "Failed to delete marks" });
  }
});

module.exports = router;
