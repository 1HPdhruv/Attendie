const express = require("express");
const {
  listStudents,
  createStudent,
  getStudentById,
  updateAttendance,
  deleteStudent,
} = require("../controllers/studentsController");

const router = express.Router();

router.get("/students", listStudents);
router.post("/students", createStudent);
router.get("/students/:studentId", getStudentById);
router.put("/students/:studentId/attendance", updateAttendance);
router.delete("/students/:studentId", deleteStudent);

module.exports = router;
