const mongoose = require("mongoose");
const logger = require("../utils/logger");


const connectDB = async (app, PORT) => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        logger.info("Connected to MongoDB");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        })
    } catch (error) {
        logger.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit the process with an error code
    }
};
module.exports = connectDB;