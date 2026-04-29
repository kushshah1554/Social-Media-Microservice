const Search = require("../models/search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("Searching post");
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }
    //check cache
    const cachedPosts = await req.redisClient.get(`search:${query}`);
    if (cachedPosts) {
      logger.info("Returning cached search results");
      return res.status(200).json(JSON.parse(cachedPosts));
    }
    const posts = await Search.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    //add cache for 3 minutes
    await req.redisClient.setex(`search:${query}`, 180, JSON.stringify(posts));
    logger.info("Search results cached");
    res.status(200).json(posts);
  } catch (error) {
    logger.error("Error searching post", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  searchPostController,
};
