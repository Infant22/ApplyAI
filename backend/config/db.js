const mongoose = require("mongoose");
const dns = require("dns");

// Attempt to set Google DNS as fallback for SRV resolution issues on certain networks
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
    console.warn("Could not set custom DNS servers:", e.message);
}

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ApplyAI", {
            serverSelectionTimeoutMS: 5000,
        });

        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error.message);
        if (error.message.includes("ENOTFOUND")) {
            console.error("⚠️ Atlas cluster may be PAUSED or DNS SRV records not found. If using MongoDB Atlas free tier, please log in to https://cloud.mongodb.com and resume your cluster.");
        }
        // Do not call process.exit(1) so Render/cloud instances do not crash-loop
        // Retry connection in background:
        setTimeout(connectDB, 15000);
    }
};

module.exports = connectDB;