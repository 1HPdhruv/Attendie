const authorization = (req, res, next) => {
  if (req.user?.role === "teacher" || req.user?.user === "teacher") {
    next();
  } else {
    return res.status(403).json({ message: "Unauthorized access" });
  }
};

module.exports = authorization;
