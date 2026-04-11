const express = require("express");
const router = express.Router();
const student = require("../model/student");
const counter = require("../model/counter");
const { body } = require("express-validator");
async function getStudent_id(student_id) {
  const data = await counter.findOneAndUpdate(
    { sequence_id: student_id },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return data.sequence_value;
}
router.post("/", async (req, res) => {
  const getid = await getStudent_id("studentid");
  req.body.id = `std_${getid}`;
  body("id").escape().trim();
  body("name").escape().trim();
  body("email").escape().trim();
  body("phone_no").escape().trim();
  body("password").escape().trim();
  const data = new student(req.body);
  data
    .save()
    .then(() => {
      res.send(true);
    })
    .catch((err) => {
      console.error("error occured in add student data handling", err);
    });
});

module.exports = router;
