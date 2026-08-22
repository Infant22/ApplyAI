const mongoose = require("mongoose");

const searchQuotaSchema = new mongoose.Schema(
    {
        date: {
            type: String, // YYYY-MM-DD
            required: true
        },
        source: {
            type: String, // "JSearch", "Adzuna", "Jooble", "General"
            required: true
        },
        count: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Create compound index for date + source uniqueness
searchQuotaSchema.index({ date: 1, source: 1 }, { unique: true });

module.exports = mongoose.model("SearchQuota", searchQuotaSchema);
