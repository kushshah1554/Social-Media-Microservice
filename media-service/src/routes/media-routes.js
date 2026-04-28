const express = require("express");
const multer = require("multer");

const { uploadMedia, getAllMedia } = require("../controllers/media-controller");
const { authenticateRequest } = require("../middlewares/authMiddleware");
const logger = require("../utils/logger");
const { createLimiter } = require("../utils/rateLimit");

const router = express.Router();
const uploadMediaLimiter = createLimiter(10, "upload");


//configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, //5mb
  },
}).single("file");

router.post(
  "/upload", 
  authenticateRequest,
  uploadMediaLimiter,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("multer error while uploading file", {
          error: err.message,
        });
        return res.status(400).json({
          message: "multer error while uploading file",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("File upload failed", { error: err.message });
        return res.status(500).json({
          message: "error while uploading file",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        logger.error("No file uploaded");
        return res.status(400).json({ message: "No file uploaded" });
      }
      next();
    });
  },
  uploadMedia,
);


router.get("/all", authenticateRequest, getAllMedia);

module.exports = router;

// router.post("/upload", authenticateRequest, upload, uploadMedia);

// const upload = multer({ dest: "uploads/" });

// router.post("/upload", upload.single("file"), uploadMedia);
