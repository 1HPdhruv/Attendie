const jwt = require("jsonwebtoken");
const Authentication = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authoriazation Token required" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ message: err });
  }
};

module.exports = Authentication;
