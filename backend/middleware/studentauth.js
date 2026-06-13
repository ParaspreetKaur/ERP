const jwt = require("jsonwebtoken");

module.exports = async function(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");
    
    if (!authHeader) {
      console.log("No Authorization header");
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    if (!token) {
      console.log("No token after Bearer removal");
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    
    // Store user info in request
    req.user = {
      id: decoded.id,
      studentId: decoded.studentId
    };
    
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};