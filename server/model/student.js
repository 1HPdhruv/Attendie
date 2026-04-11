const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const studentschema = new mongoose.Schema({
  name: String,
  id: String,
  email: String,
  phone_no: String,
  password: String,
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
