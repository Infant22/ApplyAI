const mongoose = require("mongoose");

const cachedJobSchema = new mongoose.Schema(
    {
        company: {
            type: String,
            required: true,
            trim: true
        },
        jobTitle: {
            type: String,
            required: true,
            trim: true
        },
        location: {
            type: String,
            default: "Remote",
            trim: true
        },
        workMode: {
            type: String,
            enum: ["Remote", "Hybrid", "Onsite"],
            default: "Remote"
        },
        employmentType: {
            type: String,
            default: "Full-time"
        },
        salary: {
            type: Number,
            default: 0
        },
        link: {
            type: String,
            required: true,
            unique: true, // Prevent duplicate jobs in cache
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        source: {
            type: String,
            default: "Aggregator"
        },
        pubDate: {
            type: Date,
            default: Date.now
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 86400 // TTL Index: Auto-expire documents after 24 hours (86400 seconds)
        }
    }
);

// Optimize search queries
cachedJobSchema.index({ jobTitle: "text", company: "text" });

module.exports = mongoose.model("CachedJob", cachedJobSchema);
