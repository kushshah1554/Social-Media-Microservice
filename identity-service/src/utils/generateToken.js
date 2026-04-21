const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const generateToken = async (user) => {
  const accessToken = jwt.sign(
    {
      username: user.username,
      email: user._id,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "60m" },
  ); 

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); //it will expire after 7 days
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

module.exports = generateToken;