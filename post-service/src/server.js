require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const postRoutes = require("./routes/post-route");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const redisClient = require("./confige/redisClient");

const app = express();
const PORT = process.env.PORT || 3002;

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
app.use("/api/posts",(req,res,next)=>{
    req.redisClient = redisClient;
    next();
}, postRoutes);

//error handling middleware
app.use(errorHandler);

//start server
app.listen(PORT, () => {
    logger.info(`Post service running on port ${PORT}`);
});

//unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.stack : reason,
    promise,
  });
});
