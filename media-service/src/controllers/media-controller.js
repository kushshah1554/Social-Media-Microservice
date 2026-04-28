const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/media");



const uploadMedia = async (req, res) => {
  try {
    logger.info("Uploading media...");
    //check if file is uploaded
    if (!req.file) {
      logger.warn("No file uploaded");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    const { originalname, mimetype, buffer } = req.file;
    logger.info("File info:", { originalname, mimetype });
    const userId = req.user.userId;

    //upload to cloudinary
    logger.info("uploading to cloudinary starting...");
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      "Cloudinary upload result: public_id - ",
      {public_id: cloudinaryUploadResult.public_id},
    );

    //create media record
    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      url: cloudinaryUploadResult.secure_url,
      userId: userId,
      originalname,
      mimetype,
    });

    await newlyCreatedMedia.save();
    logger.info("Media uploaded successfully:", newlyCreatedMedia.toJSON());
    //return response
    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      url: newlyCreatedMedia.url,
      mediaId: newlyCreatedMedia._id,
    });
  } catch (error) {
    logger.error("Error uploading media:", error);
    return res.status(500).json({ success: false, message: "Error uploading media" });
  }
};


const getAllMedia = async (req, res) => {
  try {
    logger.info("Getting all media...");
    const medias = await Media.find().lean();
    logger.info("Media retrieved successfully:", medias.length);
    return res.status(200).json({
      success: true,
      message: "Media retrieved successfully",
      medias,
    });
  } catch (error) {
    logger.error("Error getting media:", error);
    return res.status(500).json({ success: false, message: "Error getting media" });
  }
};


module.exports = {
  uploadMedia,
  getAllMedia,
};
