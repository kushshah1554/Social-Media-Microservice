const Search = require("../models/search");
const logger = require("../utils/logger");
const handlePostCreated = async (message) => {
  try {
    console.log("Post created event received", message);
    const { postId, userId, content, createdAt } = message;
    const search = new Search({
      postId,
      userId,
      content,
      createdAt,
    });
    await search.save();

    logger.info("Post created event handled", {
      postId,
      userId,
      content,
      createdAt,
    });
  } catch (error) {
    logger.error("Error handling post created event", {
      error: error.message,
    });
  }
};

module.exports = {
  handlePostCreated,
};
