require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./utils/logger");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middlewares/errorHandler");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 3003;

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
app.use("/api/media", mediaRoutes);

//error handling middleware
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    //consume events

    await consumeEvent("post.deleted", handlePostDeleted);

    //start server
    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
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
