const mongoose = require("mongoose");

function getHealth(_req, res) {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    ok: true,
    dbConnected,
  });
}

module.exports = {
  getHealth,
};
