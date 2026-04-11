const authorization = (req, res, next) => {
  console.log(req.user.user);

  if (req.user.user == "teacher") {
    next();
  } else {
    return res.status(401).json({ message: "unauthorized access " });
  }
};

module.exports = authorization;
