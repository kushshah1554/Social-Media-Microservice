const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload failed:", error);
          reject(error);
        } else {
          logger.info("Cloudinary upload successful:", {
            public_id: result.public_id,
            url: result.secure_url,
          });
          resolve(result);
        }
      },
    );

    // Pipe the file buffer to the upload stream
    uploadStream.end(file.buffer);
  });
};

const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Cloudinary delete successful:", {
      public_id: publicId,
      result: result,
    });
    return result;
  } catch (error) {
    logger.error("Cloudinary delete failed:", error);
    throw error;
  }
};

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
