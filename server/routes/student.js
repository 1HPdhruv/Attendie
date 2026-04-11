const express = require("express");
const router = express.Router();
const student = require("../model/student");

router.get("/", async (req, res) => {
  const id = req.query.std_id;
  const data = await student.findOne({ id: id });

  res.json(data);
});

module.exports = router;
