const Notification = require("../models/Notification");

// Create notification helper
const createNotification = async (userId, text, type = "general") => {
    try {
        await Notification.create({
            user: userId,
            text,
            type
        });
    } catch (err) {
        console.error("Failed to create notification:", err);
    }
};

// Get all notifications for authenticated user
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // limit to last 50 notifications

        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        console.error("Mark read error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (error) {
        console.error("Mark all read error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });
    } catch (error) {
        console.error("Delete notification error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
