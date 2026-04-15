const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const markSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  examType: { type: String, enum: ["internal", "midterm", "final", "assignment", "practical"], default: "internal" },
  marksObtained: { type: Number, required: true },
  maxMarks: { type: Number, required: true, default: 100 },
  semester: { type: Number, default: 1 },
  date: { type: Date, default: Date.now },
});

const studentschema = new mongoose.Schema({
  name: String,
  id: String,
  email: String,
  phone_no: String,
  password: String,
  department: { type: String, default: "" },
  admission_year: { type: Number, default: new Date().getFullYear() },
  cgpa: { type: Number, default: 0, min: 0, max: 10 },
  marks: [markSchema],
  attandance: {
    type: Map,
    of: String,
  },
});

studentschema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});
studentschema.methods.comparepassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const student = mongoose.model("Students", studentschema);

module.exports = student;
