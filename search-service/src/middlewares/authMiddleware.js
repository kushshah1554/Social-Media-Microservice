const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
  logger.info("Authenticating request");
  const userId = req.headers["x-user-id"];
  if (!userId) {
    logger.warn("User ID not found in request headers");
    return res
      .status(401)
      .json({
        success: false,
        message: "Unauthorized, please login to continue",
      });
  }
  req.user = { userId };
  next();
};

module.exports = { authenticateRequest };
