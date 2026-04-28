require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const { error } = require("winston");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

//redis client
const redisClient = new Redis(process.env.REDIS_URL);

//Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

//Rate limiting
const ratelimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Sensitive rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }), //redis store for rate limiting
});

//apply rate limiting to all requests
app.use(ratelimit);

//log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} request to ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

//proxy options
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error("Proxy error:", err?.message || err);
    res.status(500).json({
      success: false,
      message: `Internal server error`,
      error: err?.message || err,
    });
  },
};

//Setting up proxy for identity service
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json"; //set content type to json for identity service
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(
        `Response received from identity service with status: ${proxyRes.statusCode}`,
      );
      logger.info(`Response data from identity service: ${proxyResData}`);
      return proxyResData; //return the response data as is to the client
    },
  }),
);

//Setting up proxy for posts service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POSTS_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(
        `Response received from posts service with status: ${proxyRes.statusCode}`,
      );
      logger.info(`Response data from posts service: ${proxyResData}`);
      return proxyResData; //return the response data as is to the client
    },
  }),
);

//Setting up proxy for media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      console.log("Content type:", srcReq.headers["content-type"]);
      const contentType = srcReq.headers["content-type"] || "";

      if (!contentType.startsWith("multipart/form-data")) {
        proxyReqOpts.headers["content-type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(
        `Response received from media service with status: ${proxyRes.statusCode}`,
      );
      logger.info(`Response data from media service: ${proxyResData}`);
      return proxyResData; //return the response data as is to the client
    },
  }),
);

//Error handling middleware
app.use(errorHandler); 
 
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(
    `Identity service running on port ${process.env.IDENTITY_SERVICE_URL}`,
  );
  logger.info(`Posts service running on port ${process.env.POSTS_SERVICE_URL}`);
  logger.info(`Media service running on port ${process.env.MEDIA_SERVICE_URL}`);
  logger.info(`Redis URL ${process.env.REDIS_URL}`);
});
