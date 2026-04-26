const router = require("express").Router();

const { createPost,getAllPosts, getPost, deletePost } = require("../controllers/post-controller");
const { authenticateRequest } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../utils/rateLimit");


const createPostLimiter = createLimiter(15, "create");
const getPostsLimiter = createLimiter(50, "get");
const deletePostLimiter = createLimiter(5, "delete");
router.use(authenticateRequest);

router.post("/create-post",createPostLimiter, createPost);
router.get("/all-posts",getPostsLimiter, getAllPosts);
router.get("/post/:id",getPostsLimiter, getPost);
router.delete("/post/:id",deletePostLimiter, deletePost);

module.exports = router;

