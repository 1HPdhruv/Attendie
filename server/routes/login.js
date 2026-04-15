const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const router = express.Router();
const admin = require("../model/admin");
const student = require("../model/student");

const data = admin.find().then(() => {
  console.log("found sucessfully");
});
console.log();

router.get("/", async (req, res) => {
  if (mongoose.connection.readyState == 1) {
    return res.send(true);
  } else {
    await new Promise((resolve) => {
      mongoose.connection.once("connected", resolve);
    });
    console.log("connected dude");
  }

  return res.send(true);
});
router.post("/", async (req, res) => {
  let teacher;

  if (req.body.user == "Student") {
    const student_pass = await student.findOne({ id: req.body.id });

    if (
      student_pass != null &&
      (await student_pass.comparepassword(req.body.password))
    ) {
      const token_data = { user: req.body.user, id: req.body.id };
      const token = jwt.sign(token_data, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.status(200).json({ token });
    } else {
      res.status(401);
    }
  } else {
    const student_data = await admin.findOne({});
    if (
      student_data.teacher_id == req.body.id &&
      student_data.teacher_password == req.body.password
    ) {
      const token_data = { user: "teacher", id: req.body.id };
      const token = jwt.sign(token_data, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.status(200).json({ token });
    } else {
      res.status(401);
    }
  }
});

module.exports = router;
