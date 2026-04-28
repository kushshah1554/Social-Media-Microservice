const Media = require("../models/media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");


const handlePostDeleted = async (event) => {
    console.log("Post deleted", event); 
    const { postId, mediaIds } = event;
    try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
    for (const media of mediaToDelete) {
        await deleteMediaFromCloudinary(media.publicId);
        await media.deleteOne();
        logger.info(`Media ${media._id} deleted from post ${postId}`);
    }
    logger.info(`All media deleted from post ${postId}`);
    } catch (error) {
        logger.error("Error deleting media", { error });
    }
};

module.exports = {
    handlePostDeleted
};