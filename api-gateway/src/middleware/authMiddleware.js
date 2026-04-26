const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers?.["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Missing authorization header");
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      logger.error("Invalid token", err);
      return res.status(429).json({ success: false, message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { validateToken };
