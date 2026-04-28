const { RedisStore } = require("rate-limit-redis");
const logger = require("./logger");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const redisClient = require("../confige/redisClient");

//IP based Rate limiting for sensitive endpoints
const createLimiter = (max, prefix) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => `${ipKeyGenerator(req)}-${prefix}`,

    handler: (req, res) => {
      logger.warn(`Sensitive rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    },

    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  });
};

module.exports = {
  createLimiter,
};
