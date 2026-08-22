const multer = require("multer");
const path = require("path");

// Storage: save to uploads/avatars/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/avatars");
    },
    filename: (req, file, cb) => {
        // e.g. avatar-<userId>-<timestamp>.jpg
        cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
};

const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB max
});

module.exports = uploadAvatar;
