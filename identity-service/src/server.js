require("dotenv").config();
const connectDB = require("./database/dbConnection");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const authRoutes = require("./routes/identityService");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;

// calling connectDB function
connectDB(app, PORT);
// creating redis client
const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

//log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} request to ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

//DDoS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, //redis client
  keyPrefix: "middlware", //key prefix for redis
  points: 10, //10 requests per duration
  duration: 1, //per second
});

//rate limiting middleware
app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    });
});

//Ip based rate limiting for sensitive endpoints
const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute 
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Sensitive rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }), //redis store for rate limiting 
});


//apply rate limiting to specific routes
app.use("/api/auth/register", sensitiveRateLimiter);

//Routes
app.use("/api/auth", authRoutes);
//health check route
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Health check passed" });
});

//Error handling middleware
app.use(errorHandler);

//unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.stack : reason,
    promise,
  });
});
