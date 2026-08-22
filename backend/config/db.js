const mongoose = require("mongoose");
const dns = require("dns");

// Force Google DNS — system DNS doesn't support MongoDB Atlas SRV queries
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ApplyAI");

        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed");
        console.error(error.message);

        process.exit(1);
    }
};

module.exports = connectDB;