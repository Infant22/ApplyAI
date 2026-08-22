const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
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
            default: "",
            trim: true
        },
        status: {
            type: String,
            enum: ["Applied", "Interview", "Rejected", "Selected"],
            default: "Applied"
        },
        appliedDate: {
            type: Date,
            default: Date.now
        },
        jobLink: {
            type: String,
            default: "",
            trim: true
        },

        // New Fields

        workMode: {
            type: String,
            enum: ["Remote", "Hybrid", "Onsite"],
            default: "Onsite"
        },

        employmentType: {
            type: String,
            enum: [
                "Full-time",
                "Part-time",
                "Internship",
                "Contract",
                "Freelance"
            ],
            default: "Full-time"
        },

        experience: {
            type: Number,
            default: 0,
            min: 0
        },

        salary: {
            type: Number,
            default: 0,
            min: 0
        },

        // ATS Match Details
        matchPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        matchedSkills: {
            type: [String],
            default: []
        },
        missingSkills: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("JobApplication", jobApplicationSchema);