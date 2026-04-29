
const Search = require("../models/search");
const logger = require("../utils/logger");

const handlePostDeleted = async (message) => {
  try {
    logger.info("Post deleted event received", message);
    const { postId } = message;
    await Search.deleteOne({ postId });
    logger.info("Post deleted event handled", {
      postId,
    });
  } catch (error) {
    logger.error("Error handling post deleted event", {
      error: error.message,
    });
  }
};

module.exports ={ handlePostDeleted };