const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "No token" });
  }

  try {

    // ✅ REMOVE "Bearer " PREFIX
    const token = authHeader.replace("Bearer ", "");

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    req.user = verified;

    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }

};