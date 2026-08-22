const express = require("express");
const multer = require("multer");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    googleLogin,
    uploadAvatarController,
    deleteAvatarController,
    blockJob,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const avatarUpload = require("../config/avatarMulter");

// Brute-force protection rate limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 authentication requests per windowMs
    message: {
        message: "Too many authentication requests. Please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Register
router.post("/register", authLimiter, registerUser);

// Login
router.post("/login", authLimiter, loginUser);

// Google OAuth Login
router.post("/google-login", authLimiter, googleLogin);

// Forgot / Reset Password
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);

// Profile
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/block-job", authMiddleware, blockJob);

// Change Password
router.put("/change-password", authMiddleware, changePassword);

// Avatar Upload & Delete
router.post("/avatar", authMiddleware, (req, res) => {
    avatarUpload.single("avatar")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Image size should not exceed 2 MB.",
                });
            }
            return res.status(400).json({ message: err.message });
        }
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        return uploadAvatarController(req, res);
    });
});
router.delete("/avatar", authMiddleware, deleteAvatarController);

module.exports = router;