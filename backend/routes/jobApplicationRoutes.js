const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    createJobApplication,
    getAllJobApplications,
    getJobApplicationById,
    updateJobApplication,
    deleteJobApplication
} = require("../controllers/jobApplicationController");

const { getLiveJobMatches } = require("../controllers/jobFeedController");
const { draftAnswer, draftCoverLetter, getResumeAdvice, generateInterviewPrep, analyzeInterviewAnswer } = require("../controllers/aiController");

const rateLimit = require("express-rate-limit");

const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        message: "Too many search requests. Please wait a minute before searching again."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Create Job Application
router.post("/", authMiddleware, createJobApplication);

// Draft application answer
router.post("/draft-answer", authMiddleware, draftAnswer);

// Draft Cover Letter
router.post("/draft-cover-letter", authMiddleware, draftCoverLetter);

// Resume advice & keyword ATS check
router.post("/resume-advice", authMiddleware, getResumeAdvice);

// AI Interview Prep
router.post("/interview-prep", authMiddleware, generateInterviewPrep);

// AI Mock Interview Answer Analyzer
router.post("/analyze-interview-answer", authMiddleware, analyzeInterviewAnswer);

// Get All Job Applications
router.get("/", authMiddleware, getAllJobApplications);

// Search Live Web Feeds
router.get("/live-search", authMiddleware, searchLimiter, getLiveJobMatches);

// Get Single Job Application
router.get("/:id", authMiddleware, getJobApplicationById);

// Update Job Application
router.put("/:id", authMiddleware, updateJobApplication);

// Delete Job Application
router.delete("/:id", authMiddleware, deleteJobApplication);

module.exports = router;