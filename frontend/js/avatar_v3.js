// ==========================================
// Avatar Utility — shared across all pages
// Sets the profile avatar element to either
// a photo <img> or the initial letter fallback
// ==========================================

const AVATAR_API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";
const AVATAR_SERVER_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE.replace("/api", "") : window.API_BASE) : "http://localhost:5000";

/**
 * Set the avatar display for a given element.
 * @param {HTMLElement} el - The .profile-avatar div
 * @param {string} avatarFilename - filename from user.avatar
 * @param {string} userName - user's name (for fallback initial)
 */
function setAvatarDisplay(el, avatarFilename, userName) {
    if (!el) return;

    if (avatarFilename) {
        el.innerHTML = `<img src="${AVATAR_SERVER_BASE}/uploads/avatars/${avatarFilename}"
            alt="Profile Photo"
            style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        el.style.padding = "0";
        el.style.fontSize = "0";
    } else {
        el.innerHTML = "";
        el.style.padding = "";
        el.style.fontSize = "";
        el.textContent = (userName || "U").charAt(0).toUpperCase();
    }
}

/**
 * Upload a new avatar file.
 * @param {File} file
 * @param {string} token
 * @returns {Promise<string>} new filename
 */
async function uploadAvatar(file, token) {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch(`${AVATAR_API_BASE}/users/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data.avatar; // filename
}

// ==========================================
// Shared Notification Center Logic
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initSharedNotificationCenter();
});

async function initSharedNotificationCenter() {
    const notificationBtn = document.getElementById("notificationBtn");
    const notificationBadge = document.getElementById("notificationBadge");
    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationList = document.getElementById("notificationList");
    const markAllReadBtn = document.getElementById("markAllReadBtn");

    if (!notificationBtn || !notificationDropdown) return;

    // Toggle dropdown
    notificationBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = notificationDropdown.style.display === "none";
        notificationDropdown.style.display = isHidden ? "block" : "none";
        if (isHidden) {
            fetchNotifications();
        }
    });

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
        if (notificationDropdown && !notificationDropdown.contains(e.target) && e.target !== notificationBtn) {
            notificationDropdown.style.display = "none";
        }
    });

    // Fetch and render initially to show the badge count
    const token = localStorage.getItem("token");
    if (token) {
        fetchNotifications();
    }

    // Refresh notifications when custom event is triggered
    window.addEventListener("notificationUpdate", () => {
        fetchNotifications();
    });

    async function fetchNotifications() {
        try {
            const res = await fetch(`${AVATAR_API_BASE}/notifications`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                renderNotifications(data.notifications);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }

    function renderNotifications(notifications) {
        if (!notificationList) return;
        notificationList.innerHTML = "";

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="empty-notifications" style="padding: 20px; text-align: center; color: var(--text-light); font-size: 0.9rem;">
                    <i class="fa-regular fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                    <span>No notifications yet.</span>
                </div>
            `;
            if (notificationBadge) notificationBadge.style.display = "none";
            return;
        }

        const unreadCount = notifications.filter(n => !n.read).length;
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.style.display = "inline-block";
            } else {
                notificationBadge.style.display = "none";
            }
        }

        notifications.forEach(n => {
            const itemDiv = document.createElement("div");
            itemDiv.className = `notification-item ${n.read ? "" : "unread"}`;
            itemDiv.style.cursor = "pointer";
            
            // Format time nicely
            const timeStr = formatNotificationTime(n.createdAt);

            itemDiv.innerHTML = `
                <span class="notification-item-text">${n.text}</span>
                <span class="notification-item-time">${timeStr}</span>
                ${n.read ? "" : '<span class="unread-dot"></span>'}
            `;

            itemDiv.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!n.read) {
                    n.read = true;
                    itemDiv.classList.remove("unread");
                    const dot = itemDiv.querySelector(".unread-dot");
                    if (dot) dot.remove();
                    await markNotificationAsRead(n._id);
                    fetchNotifications();
                }

                // Redirect user to the corresponding page
                const targetPage = getNotificationRedirectUrl(n);
                window.location.href = targetPage;
            });

            notificationList.appendChild(itemDiv);
        });
    }

    // Helper to determine redirect URL based on notification type and text content
    function getNotificationRedirectUrl(notification) {
        const text = (notification.text || "").toLowerCase();
        const type = (notification.type || "").toLowerCase();

        // 1. Explicit check by DB type field
        if (type === "match") return "review.html";
        if (type === "application") return "applications.html";
        if (type === "resume") return "profile.html";

        // 2. Heuristic check by text content
        if (text.includes("profile") || text.includes("resume") || text.includes("avatar") || text.includes("education") || text.includes("skills")) {
            return "profile.html";
        }
        if (text.includes("apply") || text.includes("applied") || text.includes("status") || text.includes("interview") || text.includes("selected") || text.includes("rejected")) {
            return "applications.html";
        }
        if (text.includes("review") || text.includes("match") || text.includes("found") || text.includes("deduplication")) {
            return "review.html";
        }

        return "dashboard.html";
    }

    // Helper to format time relativistically
    function formatNotificationTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    async function markNotificationAsRead(id) {
        try {
            await fetch(`${AVATAR_API_BASE}/notifications/${id}/read`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
                const res = await fetch(`${AVATAR_API_BASE}/notifications/read-all`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    fetchNotifications();
                }
            } catch (err) {
                console.error("Failed to mark all notifications as read:", err);
            }
        });
    }
}

// Global helper to push a notification from the frontend
async function pushNotification(text, type = "general") {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${AVATAR_API_BASE}/notifications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ text, type })
        });
        if (res.ok) {
            window.dispatchEvent(new CustomEvent("notificationUpdate"));
        }
    } catch (err) {
        console.error("pushNotification error:", err);
    }
}
