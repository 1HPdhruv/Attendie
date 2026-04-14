const jwt = require("jsonwebtoken");
const Admin = require("../model/admin");
const Student = require("../model/student");

function createToken(payload) {
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

  if (!secret) {
    const error = new Error("JWT secret is not configured");
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

async function login(req, res) {
  const { id, password, user } = req.body;

  if (!id || !password || !user) {
    return res.status(400).json({ error: "id, password and user are required" });
  }

  if (user === "Student") {
    const student = await Student.findOne({ id });
    const isValid = student && (await student.comparepassword(password));

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createToken({ role: "student", studentId: id, user: "student" });
    return res.status(200).json({ token });
  }

  if (user === "Teacher") {
    const admin = await Admin.findOne({});

    if (!admin || admin.teacher_id !== id || admin.teacher_password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createToken({ role: "teacher", teacherId: id, user: "teacher" });
    return res.status(200).json({ token });
  }

  return res.status(400).json({ error: "Invalid user type" });
}

module.exports = {
  login,
};
