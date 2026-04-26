const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const User = require("../models/User");
const generateToken = require("../utils/generateToken.js");
const RefreshToken = require("../models/RefreshToken.js");

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
    //check if user already exists
    let user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (user) {
      logger.warn("Registration failed ----->>>>", "User already exists");

      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }
    //create new user
    user = new User({ username, email, password });
    await user.save();
    logger.warn("Registration success ----->>>>", user._id);

    const { accessToken, refreshToken } = await generateToken(user);

    return res.status(201).json({
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

//user login
const loginUser = async (req, res) => {
  logger.info("Login endpoint hit ----->>>>");
  try {
    //validate login
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Login failed ----->>>>", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    //check if user exists
    if (!user) {
      logger.warn("Login failed ----->>>>", "User not found");
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    //check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      logger.warn("Login failed ----->>>>", "Invalid password");
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }
    //generate tokens
    const { accessToken, refreshToken } = await generateToken(user);
    //return success response
    return res.status(200).json({
      success: true,
      message: "Login success",
      userId: user._id,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Login failed ----->>>>", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

//Refresh Token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hit ----->>>>");
  try {
    const { refreshToken } = req.body;
    //check if refresh token is provided
    if (!refreshToken) {
      logger.info("Refresh token is required ----->>>>");
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is required" });
    }
    //check if refresh token exists in database
    const storedRefreshToken = await RefreshToken.findOne({
      token: refreshToken,
    });
    if (!storedRefreshToken || storedRefreshToken.expiresAt < new Date()) {
      logger.warn("Refresh token failed ----->>>>", "Invalid refresh token");
      return res
        .status(400)
        .json({ success: false, message: "Invalid refresh token" });
    }

    //check if user exists
    const user = await User.findById(storedRefreshToken.userId);
    if (!user) {
      logger.warn("Refresh token failed ----->>>>", "User not found");
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    //delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedRefreshToken._id });

    return res.status(200).json({
      success: true,
      message: "Refresh token success",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh token failed ----->>>>", error);
    return res
      .status(500)
      .json({ success: false, message: "Refresh token failed" });
  }
};

//logout
const logoutUser = async (req,res)=>{
  logger.info("Logout endpoint hit ----->>>>");
  try {
    const { refreshToken } = req.body;
    //check if refresh token is provided
    if (!refreshToken) {
      logger.info("Refresh token is required ----->>>>");
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is required" });
    }
    //check if refresh token exists in database
    const storedRefreshToken = await RefreshToken.findOne({
      token: refreshToken,
    });
    if (!storedRefreshToken) {
      logger.warn("Refresh token failed ----->>>>", "Invalid refresh token");
      return res
        .status(400)
        .json({ success: false, message: "Invalid refresh token" });
    }
    
    //delete the refresh token
    await RefreshToken.deleteOne({ _id: storedRefreshToken._id });
    
    logger.info("Logout success refresh token deleted ----->>>>");
    return res.status(200).json({
      success: true,
      message: "Logout success",
    });
    
  } catch (error) {

    logger.error("Logout failed ----->>>>", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
    
  }
}

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };

