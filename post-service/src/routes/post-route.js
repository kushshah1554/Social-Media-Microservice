const router = require("express").Router();
const multer = require("multer");

const { createPost,getAllPosts, getPost, deletePost } = require("../controllers/post-controller");
const { authenticateRequest } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../utils/rateLimit");


const createPostLimiter = createLimiter(15, "create");
const getPostsLimiter = createLimiter(50, "get");
const deletePostLimiter = createLimiter(5, "delete");
router.use(authenticateRequest);

// optional files (multipart field "files"), forwarded to media-service by createPost
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
}).array("files", 4);
const handleUpload = (req, res, next) =>
  upload(req, res, (err) =>
    err ? res.status(400).json({ success: false, message: err.message }) : next(),
  );

router.post("/create-post", createPostLimiter, handleUpload, createPost);
router.get("/all-posts",getPostsLimiter, getAllPosts);
router.get("/post/:id",getPostsLimiter, getPost);
router.delete("/post/:id",deletePostLimiter, deletePost);

module.exports = router;

