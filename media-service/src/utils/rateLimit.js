const { RedisStore } = require("rate-limit-redis");
const logger = require("./logger");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const redisClient = require("../confige/redisClient");

// Per-user rate limiting: behind the gateway every request has the same IP,
// so the user id (set by authenticateRequest) is the only useful key
const createLimiter = (max, prefix) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) =>
      `${req.user?.userId || ipKeyGenerator(req.ip)}-${prefix}`,

    handler: (req, res) => {
      logger.warn(`Rate limit exceeded`, { userId: req.user?.userId, ip: req.ip, prefix });
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
