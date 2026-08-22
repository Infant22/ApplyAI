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
