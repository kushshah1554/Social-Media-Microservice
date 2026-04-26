const router = require("express").Router();

const { createPost } = require("../controllers/post-controller");
const { authenticateRequest } = require("../middlewares/authMiddleware");
const { createLimiter } = require("../utils/rateLimit");


const createPostLimiter = createLimiter(15, "create");
// const getPostsLimiter = createLimiter(30, "get");

router.use(authenticateRequest);

router.post("/create-post",createPostLimiter, createPost);

module.exports = router;

