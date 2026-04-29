require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const searchRoutes = require("./routes/search-routes");
const { handlePostCreated } = require("./eventhandlers/handlePostCreated");
const { handlePostDeleted } = require("./eventhandlers/handlePostDeleted");
const app = express();
const PORT = process.env.PORT || 3004;
const redisClient = require("./confige/redisClient");

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error) => {
    logger.error("Error connecting to MongoDB", error);
  });

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

//routes
app.use(
  "/api/search",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  searchRoutes,
);

//error handling middleware
app.use(errorHandler);

//start server
async function startServer() {
  try {
    await connectToRabbitMQ();
    //consume events

    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);

    //start server
    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Error starting server", error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.stack : reason,
    promise,
  });
});
