const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function() {
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      default: "",
    },
    resetPasswordToken: {
      type: String,
      default: "",
    },
    resetPasswordExpires: {
      type: Date,
    },

    resume: {
      type: String,
      default: ""
    },
    resumePublicId: {
      type: String,
      default: ""
    },
    resumeText: {
      type: String,
      default: ""
    },
    avatar: {
      type: String,
      default: ""
    },
    avatarPublicId: {
      type: String,
      default: ""
    },

    // Profile Details
    phone: {
      type: String,
      default: ""
    },
    education: {
      type: String,
      default: ""
    },
    experience: {
      type: String,
      default: ""
    },
    skills: {
      type: [String],
      default: []
    },
    portfolio: {
      type: String,
      default: ""
    },
    linkedin: {
      type: String,
      default: ""
    },
    github: {
      type: String,
      default: ""
    },
    currentTitle: {
      type: String,
      default: ""
    },
    currentCompany: {
      type: String,
      default: ""
    },
    noticePeriod: {
      type: String,
      default: ""
    },
    expectedSalary: {
      type: String,
      default: ""
    },
    requireSponsorship: {
      type: String,
      default: "No"
    },

    // Preferences
    prefRoles: {
      type: [String],
      default: []
    },
    prefLocations: {
      type: [String],
      default: []
    },
    prefExperience: {
      type: String,
      default: ""
    },
    prefSalary: {
      type: String,
      default: ""
    },
    prefWorkMode: {
      type: String,
      enum: ["Remote", "Hybrid", "Onsite", "Any"],
      default: "Any"
    },
    prefEmploymentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract", "Freelance", "Any"],
      default: "Any"
    },
    includeRemoteJobs: {
      type: Boolean,
      default: false
    },
    remotePrefIndia: {
      type: Boolean,
      default: true
    },
    remotePrefOutside: {
      type: Boolean,
      default: false
    },
    blockedJobs: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);