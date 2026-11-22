const Media = require("../models/media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

// Uploads not attached to a post after 24h are deleted. Uploads happen milliseconds before the post is
// saved, but post.created can be delayed while RabbitMQ is down, so keep this window generous.
// shortcut: a broker outage longer than 24h would delete files of real posts; ask post-service before deleting if that matters.
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

// Deletes each file from Cloudinary and the DB; one failure doesn't stop the rest.
const deleteMediaList = async (mediaList, reason) => {
    for (const media of mediaList) {
        try {
            await deleteMediaFromCloudinary(media.publicId);
            await media.deleteOne();
            logger.info(`Media ${media._id} deleted (${reason})`);
        } catch (error) {
            logger.error(`Error deleting media ${media._id} (${reason})`, { error: error.message });
        }
    }
};

// Marks the post's files as attached so the orphan cleanup leaves them alone.
const handlePostCreated = async (event) => {
    const { postId, userId, mediaIds = [] } = event;
    if (mediaIds.length === 0) return;
    try {
        const result = await Media.updateMany(
            { _id: { $in: mediaIds }, userId, postId: null },
            { $set: { postId } },
        );
        logger.info(`Attached ${result.modifiedCount} media to post ${postId}`);
    } catch (error) {
        logger.error("Error attaching media", { postId, error: error.message });
    }
};

const handlePostDeleted = async (event) => {
    const { postId, userId, mediaIds = [] } = event;
    try {
        // only the post owner's media
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds }, userId });
        await deleteMediaList(mediaToDelete, `post ${postId} deleted`);
    } catch (error) {
        logger.error("Error deleting media", { postId, error: error.message });
    }
};

const cleanupOrphanMedia = async () => {
    try {
        // $type "null" matches only an explicit null, so media saved before postId existed is left alone
        const orphans = await Media.find({
            postId: { $type: "null" },
            createdAt: { $lt: new Date(Date.now() - ORPHAN_AGE_MS) },
        }).limit(100); // the rest are picked up on the next run
        if (orphans.length > 0) await deleteMediaList(orphans, "orphan cleanup");
    } catch (error) {
        logger.error("Error cleaning up orphan media", { error: error.message });
    }
};

module.exports = {
    handlePostCreated,
    handlePostDeleted,
    cleanupOrphanMedia,
};
