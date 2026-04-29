const Post = require("../models/post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCache(req, inputId) {
  logger.info("Invalidating post cache");

  if (inputId) {
    const key = `posts:${inputId}`;
    await req.redisClient.del(key);
    logger.info("Invalidated post cache");
  }
  const keys = await req.redisClient.keys(`posts:*`);
  if (keys.length > 0) {
    await req.redisClient.del(...keys);
    logger.info("Invalidated post cache");
  }
}

const createPost = async (req, res) => {
  try {
    logger.info("Post creation endpoint hit ----->>>>");
    // Validate request body
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("validation failed ----->>>>", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { content, mediaIds } = req.body;
    // Create post in database
    const newlyCreatedPost = await Post.create({
      content,
      mediaIds: mediaIds || [],
      userId: req.user.userId,
    });

    // Publish post.created event
    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.userId.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });
    logger.info("Event published to RabbitMQ", { routingKey: "post.created" });
    await invalidatePostCache(req, newlyCreatedPost._id.toString()); // Invalidate post cache

    logger.info({
      message: "Post created successfully",
      post: newlyCreatedPost.toObject(),
    });
    res
      .status(201)
      .json({ success: true, message: "Post created successfully" });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({ success: false, message: "Error creating post" });
  }
};

const getAllPosts = async (req, res) => {
  try {
    logger.info("Getting all posts endpoint hit ----->>>>");
    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Create cache key
    const cacheKey = `posts:${page}:${limit}`;
    // Get posts from cache
    const cachedPosts = await req.redisClient.get(cacheKey);
    // If posts are in cache, return them
    if (cachedPosts) {
      logger.info("Getting all posts from cache");
      return res
        .status(200)
        .json({ success: true, data: JSON.parse(cachedPosts) });
    }

    // Get posts from database
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    // Get total number of posts
    const totalNoOfPosts = await Post.countDocuments();
    // Cache the result
    const cacheData = {
      posts,
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };
    // Set cache for 5 minutes
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(cacheData));
    // Return the result
    res.status(200).json({ success: true, data: cacheData });
  } catch (error) {
    logger.error("Error getting all posts", error);
    res
      .status(500)
      .json({ success: false, message: "Error getting all posts" });
  }
};

const getPost = async (req, res) => {
  try {
    logger.info("Getting post endpoint hit ----->>>>");

    const { id } = req.params;

    // Create cache key
    const cacheKey = `post:${id}`;
    // Get post from cache
    const cachedPost = await req.redisClient.get(cacheKey);
    // If post is in cache, return it
    if (cachedPost) {
      logger.info("Getting post from cache");
      return res
        .status(200)
        .json({ success: true, data: JSON.parse(cachedPost) });
    }

    // Get post from database
    const post = await Post.findById(id).lean();
    // If post is not found, return error
    if (!post) {
      logger.error("Post not found");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    // Cache the result
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(post));
    // Return the result
    logger.info("Getting post from database");
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    logger.error("Error getting post", error);
    res.status(500).json({ success: false, message: "Error getting post" });
  }
};

const deletePost = async (req, res) => {
  try {
    logger.info("Deleting post endpoint hit ----->>>>");
    const { id } = req.params;

    // Delete post from database
    logger.info("Deleting post from database");
    const post = await Post.findOneAndDelete({
      _id: id,
      userId: req.user.userId,
    });
    // If post is not found, return error
    if (!post) {
      logger.error("Post not found");
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Publish event to RabbitMQ
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    // Invalidate cache
    await invalidatePostCache(req, id);

    // Return the result
    res.status(200).json({ success: true,message: "Post deleted successfully", data: post });
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).json({ success: false, message: "Error deleting post" });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
};
