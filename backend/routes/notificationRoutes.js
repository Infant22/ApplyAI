const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { text, type } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: "Text is required" });
        }
        await createNotification(req.user.id, text, type || "general");
        return res.status(201).json({ success: true, message: "Notification created successfully" });
    } catch (err) {
        console.error("Create notification API error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/", authMiddleware, getNotifications);
router.put("/read-all", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markAsRead);
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;
