const Counter = require("../model/counter");
const Student = require("../model/student");
const { mapStudent } = require("../utils/studentMapper");

async function getNextStudentId() {
  const counter = await Counter.findOneAndUpdate(
    { sequence_id: "studentid" },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );

  return `std_${counter.sequence_value}`;
}

function isTeacher(req) {
  return req.user?.role === "teacher" || req.user?.user === "teacher";
}

function canReadStudent(req, studentId) {
  if (isTeacher(req)) return true;
  return req.user?.studentId === studentId || req.user?.id === studentId;
}

async function listStudents(req, res) {
  if (!isTeacher(req)) {
    return res.status(403).json({ error: "Only teachers can access all students" });
  }

  const students = await Student.find({}).sort({ id: 1 });
  return res.status(200).json(students.map(mapStudent));
}

async function createStudent(req, res) {
  if (!isTeacher(req)) {
    return res.status(403).json({ error: "Only teachers can add students" });
  }

  const { name, email, phone_no: phoneNoFromLegacy, phoneNo, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "name and password are required" });
  }

  const id = await getNextStudentId();
  const student = await Student.create({
    id,
    name,
    email: email || "",
    phone_no: phoneNoFromLegacy || phoneNo || "",
    password,
    attandance: {},
  });

  return res.status(201).json(mapStudent(student));
}

async function getStudentById(req, res) {
  const { studentId } = req.params;

  if (!canReadStudent(req, studentId)) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  const student = await Student.findOne({ id: studentId });
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.status(200).json(mapStudent(student));
}

async function updateAttendance(req, res) {
  if (!isTeacher(req)) {
    return res.status(403).json({ error: "Only teachers can update attendance" });
  }

  const { studentId } = req.params;
  const { attendance } = req.body;

  if (!attendance || typeof attendance !== "object") {
    return res.status(400).json({ error: "attendance object is required" });
  }

  const updated = await Student.findOneAndUpdate(
    { id: studentId },
    { attandance: attendance },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.status(200).json(mapStudent(updated));
}

async function deleteStudent(req, res) {
  if (!isTeacher(req)) {
    return res.status(403).json({ error: "Only teachers can delete students" });
  }

  const { studentId } = req.params;
  const result = await Student.deleteOne({ id: studentId });

  if (!result.deletedCount) {
    return res.status(404).json({ error: "Student not found" });
  }

  return res.status(200).json({ success: true });
}

module.exports = {
  listStudents,
  createStudent,
  getStudentById,
  updateAttendance,
  deleteStudent,
};
