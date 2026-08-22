const express = require("express");
const multer = require("multer");
const router = express.Router();

const upload = require("../config/multer");
const {
    uploadResume,
    getResume,
    deleteResume
} = require("../controllers/resumeController");

const authMiddleware = require("../middleware/authMiddleware");

// Get Uploaded Resume
router.get("/", authMiddleware, getResume);

// Upload Resume
router.post("/upload", authMiddleware, (req, res) => {

    upload.single("resume")(req, res, (err) => {

        // Multer errors
        if (err instanceof multer.MulterError) {

            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Resume size should not exceed 5 MB."
                });
            }

            return res.status(400).json({
                message: err.message
            });
        }

        // File type errors
        if (err) {
            return res.status(400).json({
                message: err.message
            });
        }

        uploadResume(req, res);

    });

});

// Delete Resume
router.delete("/", authMiddleware, deleteResume);

module.exports = router;