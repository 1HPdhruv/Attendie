const express = require("express");
const app = express();
const mongoose = require("mongoose");
const authenticate = require("./middelware/authentication");
const authorization = require("./middelware/authorization");
const LoginRouter = require("./routes/login");
const StudentRouter = require("./routes/student");
const TeacherRouter = require("./routes/Teacher");
const AddStudentRouter = require("./routes/AddStudent");
const cors = require("cors");
const admin = require("./model/admin");
const student = require("./model/student");
require('dotenv').config()
mongoose
  .connect(process.env.MONGODB)
  .then(() => {
    console.log("connected to monogo");
  })
  .catch((err) => {
    console.error("error occured in monogo connection", err);
  });
app.use(cors());
app.use(express.json());
app.use("/", LoginRouter);
app.use("/Student", authenticate, StudentRouter);
app.use("/Teacher", authenticate, authorization, TeacherRouter);
app.use("/AddStudent", authenticate, AddStudentRouter);

app.listen(process.env.PORT,'0.0.0.0', () => {
  console.log("Lisenting...");
});
