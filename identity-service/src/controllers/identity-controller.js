const logger = require("../utils/logger");
const validateRegistration = require("../utils/validation");
const User = require("../models/User");
const generateToken = require("../utils/generateToken.js");

//user register
const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit ----->>>>");
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Registration failed ----->>>>", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { username, email, password } = req.body;
    let user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (user) {
      logger.warn("Registration failed ----->>>>", "User already exists");

      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }
    user = new User({ username, email, password });
    await user.save();
    logger.warn("Registration success ----->>>>", user._id);
    const { accessToken, refreshToken } = generateToken(user);

    return res
      .status(201)
      .json({
        success: true,
        message: "Registration success",
        accessToken,
        refreshToken,
      });
  } catch (error) {
    logger.error("Registration failed ----->>>>", error);
    return res
      .status(500)
      .json({ success: false, message: "Registration failed" });
  }
};

module.exports = { registerUser };
