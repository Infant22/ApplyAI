// ==========================================
// Authentication Guard
// ==========================================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token || !user) {
    window.location.href = "login.html";
}

// Backend Server URL
window.API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";

// Page State
let allApplications = [];

// DOM Elements
const appSearchInput = document.getElementById("appSearchInput");
const statusFilter = document.getElementById("statusFilter");
const tableBody = document.getElementById("fullApplicationsTableBody");

// Mobile menu toggle
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("pendingReviews");
        window.location.href = "login.html";
    });
}

// ==========================================
// Toast Notifications
// ==========================================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.className = `toast show ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
        <span>${message}</span>
    `;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ==========================================
// Mobile Responsive Toggle
// ==========================================
if (menuToggle && sidebar && sidebarOverlay) {
    const toggleSidebar = () => {
        sidebar.classList.toggle("active");
        sidebarOverlay.classList.toggle("active");
    };

    menuToggle.addEventListener("click", toggleSidebar);
    sidebarOverlay.addEventListener("click", toggleSidebar);
}

// ==========================================
// Logout Handler
// ==========================================
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("pendingReviews");
        window.location.href = "login.html";
    });
}

// ==========================================
// Fetch All Applications
// ==========================================
async function fetchApplications() {
    try {
        const res = await fetch(`${API_BASE}/jobs`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to fetch applications.");
        }

        allApplications = data.jobs;

        // Set Topbar info (Local Storage fallback for instant load)
        if (user) {
            if (document.getElementById("profileName")) {
                document.getElementById("profileName").textContent = (user.name || "").split(" ")[0];
            }
            const avatarEl = document.getElementById("profileAvatar");
            setAvatarDisplay(avatarEl, user.avatar, user.name);

            // Fetch fresh user profile details from backend to sync avatar image
            fetch(`${window.API_BASE}/users/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.user) {
                    const profile = data.user;
                    if (document.getElementById("profileName")) {
                        document.getElementById("profileName").textContent = (profile.name || "").split(" ")[0];
                    }
                    setAvatarDisplay(avatarEl, profile.avatar, profile.name);

                    // Sync updated profile to localStorage
                    const storedUser = JSON.parse(localStorage.getItem("user")) || {};
                    storedUser.avatar = profile.avatar;
                    storedUser.name = profile.name;
                    localStorage.setItem("user", JSON.stringify(storedUser));
                }
            })
            .catch(err => console.error("Failed to sync fresh user profile:", err));
        }

        filterAndRenderTable();

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================
// Filter and Render Table
// ==========================================
function filterAndRenderTable() {
    const searchVal = appSearchInput.value.trim().toLowerCase();
    const statusVal = statusFilter.value;

    const filtered = allApplications.filter(app => {
        // Search filter
        const matchesSearch = 
            app.company.toLowerCase().includes(searchVal) ||
            app.jobTitle.toLowerCase().includes(searchVal) ||
            (app.location && app.location.toLowerCase().includes(searchVal));

        // Status filter
        const matchesStatus = statusVal === "All" || app.status === statusVal;

        return matchesSearch && matchesStatus;
    });

    renderTableRows(filtered);
}

function renderTableRows(applicationsList) {
    tableBody.innerHTML = "";

    if (applicationsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fa-regular fa-folder-open"></i>
                    <p>No job applications found matching your criteria.</p>
                </td>
            </tr>
        `;
        return;
    }

    // Sort by appliedDate descending
    applicationsList.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));

    applicationsList.forEach(app => {
        const row = document.createElement("tr");
        row.style.cursor = "pointer";

        const formattedDate = app.appliedDate 
            ? new Date(app.appliedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : "N/A";

        row.innerHTML = `
            <td style="font-weight: 600; color: var(--text);">${app.company}</td>
            <td>${app.jobTitle}</td>
            <td><i class="fa-solid fa-location-dot" style="font-size: 0.8rem; color: var(--text-light)"></i> ${app.location || 'N/A'}</td>
            <td>${app.workMode || 'Onsite'}</td>
            <td>${app.employmentType || 'Full-time'}</td>
            <td>${formattedDate}</td>
            <td><span class="status-badge ${app.status.toLowerCase()}">${app.status}</span></td>
            <td>
                <div class="table-actions">
                    <select class="status-select" data-id="${app._id}">
                        <option value="Applied" ${app.status === "Applied" ? "selected" : ""}>Applied</option>
                        <option value="Interview" ${app.status === "Interview" ? "selected" : ""}>Interview</option>
                        <option value="Selected" ${app.status === "Selected" ? "selected" : ""}>Selected</option>
                        <option value="Rejected" ${app.status === "Rejected" ? "selected" : ""}>Rejected</option>
                    </select>
                    <button class="delete-action-btn" data-id="${app._id}" title="Delete application">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;

        // Attach Select Change Event Listener
        row.querySelector(".status-select").addEventListener("change", (e) => {
            updateApplicationStatus(e.target.dataset.id, e.target.value);
        });

        // Attach Delete Button Event Listener
        row.querySelector(".delete-action-btn").addEventListener("click", (e) => {
            const btn = e.currentTarget;
            deleteApplication(btn.dataset.id);
        });

        // Open details drawer on row click
        row.addEventListener("click", (e) => {
            if (e.target.closest(".status-select") || e.target.closest(".delete-action-btn")) {
                return;
            }
            openJobDrawer(app);
        });

        tableBody.appendChild(row);
    });
}

// ==========================================
// Update Status API
// ==========================================
async function updateApplicationStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/jobs/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to update status.");
        }

        // Update local state
        const appIndex = allApplications.findIndex(a => a._id === id);
        if (appIndex !== -1) {
            allApplications[appIndex].status = newStatus;
        }

        showToast(`Status updated to ${newStatus}!`, "success");
        filterAndRenderTable();

    } catch (err) {
        showToast(err.message, "error");
        // Re-fetch to reset select UI state on failure
        fetchApplications();
    }
}

// ==========================================
// Delete Application API
// ==========================================
async function deleteApplication(id) {
    if (!confirm("Are you sure you want to delete this application?")) return;

    try {
        const res = await fetch(`${API_BASE}/jobs/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to delete application.");
        }

        // Update local state
        allApplications = allApplications.filter(a => a._id !== id);

        showToast("Application deleted successfully!", "success");
        filterAndRenderTable();

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================
// Toolbar Listeners
// ==========================================
if (appSearchInput) {
    appSearchInput.addEventListener("input", filterAndRenderTable);
}

if (statusFilter) {
    statusFilter.addEventListener("change", filterAndRenderTable);
}

// Initialise Page
document.addEventListener("DOMContentLoaded", fetchApplications);

// ==========================================
// Slide-out Drawer Controller
// ==========================================
const jobDrawer = document.getElementById("jobDrawer");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");

if (closeDrawerBtn && jobDrawer) {
    closeDrawerBtn.addEventListener("click", () => {
        jobDrawer.classList.remove("active");
    });
    
    // Close on overlay background click
    jobDrawer.addEventListener("click", (e) => {
        if (e.target === jobDrawer) {
            jobDrawer.classList.remove("active");
        }
    });
}

function openJobDrawer(app) {
    if (!jobDrawer) return;

    document.getElementById("drawRole").textContent = app.jobTitle;
    document.getElementById("drawCompany").textContent = app.company;
    document.getElementById("drawLocation").textContent = app.location || "Remote";
    
    // Match badge
    const drawMatch = document.getElementById("drawMatch");
    if (drawMatch) {
        const matchPct = app.matchPercent || 0;
        drawMatch.textContent = `${matchPct}% Match`;
        
        // Coded colors for badge
        let badgeClass = "low-match";
        if (matchPct >= 85) badgeClass = "high-match";
        else if (matchPct >= 70) badgeClass = "mid-match";
        drawMatch.className = `detail-match-tag ${badgeClass}`;
    }

    // Other details
    document.getElementById("drawWorkMode").textContent = app.workMode || "Onsite";
    document.getElementById("drawType").textContent = app.employmentType || "Full-time";
    document.getElementById("drawSalary").textContent = app.salary ? `${app.salary} LPA` : "Not specified";
    
    const drawLink = document.getElementById("drawLink");
    if (drawLink) {
        if (app.jobLink) {
            drawLink.href = app.jobLink;
            drawLink.style.display = "inline-block";
        } else {
            drawLink.style.display = "none";
        }
    }

    // Skills Matched & Missing
    const diagnostics = document.getElementById("drawSkillsDiagnostics");
    const matchedContainer = document.getElementById("drawMatchedSkills");
    const missingContainer = document.getElementById("drawMissingSkills");

    if (diagnostics && matchedContainer && missingContainer) {
        matchedContainer.innerHTML = "";
        missingContainer.innerHTML = "";

        const matched = app.matchedSkills || [];
        const missing = app.missingSkills || [];

        if (matched.length > 0 || missing.length > 0) {
            diagnostics.style.display = "block";
            
            if (matched.length > 0) {
                matched.forEach(skill => {
                    const span = document.createElement("span");
                    span.className = "skill-pill matched";
                    span.innerHTML = `<i class="fa-solid fa-check"></i> ${skill}`;
                    matchedContainer.appendChild(span);
                });
            } else {
                matchedContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-light); font-style: italic;">None</span>`;
            }

            if (missing.length > 0) {
                missing.forEach(skill => {
                    const span = document.createElement("span");
                    span.className = "skill-pill missing";
                    span.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${skill}`;
                    missingContainer.appendChild(span);
                });
            } else {
                missingContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-light); font-style: italic;">None</span>`;
            }
        } else {
            diagnostics.style.display = "none";
        }
    }

    jobDrawer.classList.add("active");
}
