const express = require("express");
const router = express();
const student = require("../model/student");
const { body } = require("express-validator");

router.get("/", (req, res) => {
  student.find({}).then((data) => res.json(data));
});
router.put("/", [body("*.attandance.*").trim().escape()], async (req, res) => {
  const update = req.body;

  await Promise.all(
    update.map((item) => {
      console.log(item.attandance);
      return student.findOneAndUpdate(
        { id: item.id },
        { attandance: item.attandance },
        { upsert: true }
      );
    })
  );
  res.send(true);

  // Object.keys(update).forEach(keys=>{
  //     data[keys]={...data[keys],...update[keys]}
  // })
});

router.delete("/", async (req, res) => {
  const id_array = req.body;

  await Promise.all(id_array.map((id) => student.deleteOne({ id: id })));
  res.send(true);
});

module.exports = router;
