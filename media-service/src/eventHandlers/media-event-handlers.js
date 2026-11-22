const Media = require("../models/media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");


const handlePostDeleted = async (event) => {
    console.log("Post deleted", event); 
    const { postId, userId, mediaIds } = event;
    try {
    // only the post owner's media: mediaIds come from user input at post creation
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds }, userId });
    for (const media of mediaToDelete) {
        try {
            await deleteMediaFromCloudinary(media.publicId);
            await media.deleteOne();
            logger.info(`Media ${media._id} deleted from post ${postId}`);
        } catch (error) {
            // keep going so one failed file doesn't block the rest
            logger.error(`Error deleting media ${media._id} from post ${postId}`, { error });
        }
    }
    logger.info(`Finished deleting media for post ${postId}`);
    } catch (error) {
        logger.error("Error deleting media", { error });
    }
};

module.exports = {
    handlePostDeleted
};