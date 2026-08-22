// ==========================================
// Authentication Check & Initialization
// ==========================================

window.API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));
let weeklyStatsData = null;

if (!token || !user) {
    window.location.href = "login.html";
} else {
    // Load Logged-in User Info (Local Storage fallback for instant load)
    const firstName = (user.name || "").split(" ")[0];
    if (document.getElementById("userName")) {
        document.getElementById("userName").textContent = firstName;
    }
    if (document.getElementById("profileName")) {
        document.getElementById("profileName").textContent = firstName;
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
            const profileFirstName = (profile.name || "").split(" ")[0];
            if (document.getElementById("userName")) {
                document.getElementById("userName").textContent = profileFirstName;
            }
            if (document.getElementById("profileName")) {
                document.getElementById("profileName").textContent = profileFirstName;
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



    // ==========================================
    // Analytics Summary Modal
    // ==========================================
    const viewReportBtn = document.getElementById("viewReportBtn");
    const analyticsModal = document.getElementById("analyticsModal");
    const closeAnalyticsModal = document.getElementById("closeAnalyticsModal");
    const closeAnalyticsModalBtn = document.getElementById("closeAnalyticsModalBtn");

    if (viewReportBtn && analyticsModal) {
        viewReportBtn.addEventListener("click", () => {
            if (!weeklyStatsData) return;

            // Calculate weekly total
            const totalSent = weeklyStatsData.timeline.reduce((acc, t) => acc + t.count, 0);

            // Find peak day
            let peakDay = weeklyStatsData.timeline[0];
            weeklyStatsData.timeline.forEach(t => {
                if (t.count > peakDay.count) {
                    peakDay = t;
                }
            });

            // Format peak text
            const dateObj = new Date(peakDay.date);
            const formattedPeak = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            
            const reportTotalCount = document.getElementById("reportTotalCount");
            const reportPeakDayText = document.getElementById("reportPeakDayText");
            const reportRecommendationsText = document.getElementById("reportRecommendationsText");

            if (reportTotalCount) reportTotalCount.textContent = totalSent;
            if (reportPeakDayText) {
                if (peakDay.count > 0) {
                    reportPeakDayText.innerHTML = `Your busiest day was <strong>${formattedPeak}</strong> with <strong>${peakDay.count}</strong> applications submitted.`;
                } else {
                    reportPeakDayText.textContent = "No applications logged in the last 7 days yet.";
                }
            }
            if (reportRecommendationsText) {
                if (totalSent >= 10) {
                    reportRecommendationsText.textContent = "High activity! Ensure you optimize your resume utilizing the ATS Resume Advisor and practice mock interview questions in the Review panel.";
                } else {
                    reportRecommendationsText.textContent = "Activity is currently low. Try adjusting filters or expanding search modes on the dashboard to discover more job matches.";
                }
            }

            analyticsModal.classList.add("active");
        });
    }

    if (closeAnalyticsModal && analyticsModal) {
        closeAnalyticsModal.addEventListener("click", () => {
            analyticsModal.classList.remove("active");
        });
    }

    if (closeAnalyticsModalBtn && analyticsModal) {
        closeAnalyticsModalBtn.addEventListener("click", () => {
            analyticsModal.classList.remove("active");
        });
    }

    if (analyticsModal) {
        analyticsModal.addEventListener("click", (e) => {
            if (e.target === analyticsModal) {
                analyticsModal.classList.remove("active");
            }
        });
    }

    // ==========================================
    // Add Job Modal
    // ==========================================
    const addJobBtn = document.getElementById("addJobBtn");
    const jobModal = document.getElementById("jobModal");
    const closeModal = document.getElementById("closeModal");
    const cancelModal = document.getElementById("cancelModal");

    if (addJobBtn && jobModal) {
        addJobBtn.addEventListener("click", () => {
            jobModal.classList.add("active");
        });
    }

    if (closeModal && jobModal) {
        closeModal.addEventListener("click", () => {
            jobModal.classList.remove("active");
        });
    }

    if (cancelModal && jobModal) {
        cancelModal.addEventListener("click", () => {
            jobModal.classList.remove("active");
        });
    }

    if (jobModal) {
        jobModal.addEventListener("click", (e) => {
            if (e.target === jobModal) {
                jobModal.classList.remove("active");
            }
        });
    }

    // ==========================================
    // Save Job Application manually
    // ==========================================
    const jobForm = document.getElementById("jobForm");

    if (jobForm) {
        jobForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const jobData = {
                company: document.getElementById("company").value.trim(),
                jobTitle: document.getElementById("jobTitle").value.trim(),
                location: document.getElementById("location").value.trim(),
                status: document.getElementById("status").value,
                appliedDate: document.getElementById("appliedDate").value,
                jobLink: document.getElementById("jobLink").value.trim(),
                workMode: document.getElementById("workMode").value,
                employmentType: document.getElementById("employmentType").value,
                experience: Number(document.getElementById("experience").value) || 0,
                salary: Number(document.getElementById("salary").value) || 0
            };

            try {
                const response = await fetch(`${window.API_BASE}/jobs`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(jobData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to save job.");
                }

                showToast("Job application saved successfully!", "success");
                jobForm.reset();
                jobModal.classList.remove("active");
                loadJobApplications();

            } catch (error) {
                showToast(error.message, "error");
                console.error(error);
            }
        });
    }

    // ==========================================
    // Search Applications
    // ==========================================
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", loadJobApplications);
    }

    // ==========================================
    // Mobile Sidebar Toggle
    // ==========================================
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.add("active");
            sidebarOverlay.classList.add("active");
        });

        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            sidebarOverlay.classList.remove("active");
        });
    }

    // ==========================================
    // Logout Handler
    // ==========================================
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

    // Live jobs fetched directly from backend feeds

    // ==========================================
    // AI Job Agent Hunt Engine
    // ==========================================
    const startHuntBtn = document.getElementById("startHuntBtn");
    const consoleBody = document.getElementById("consoleBody");
    const consoleStatusVal = document.getElementById("consoleStatusVal");
    const progressBarFill = document.getElementById("progressBarFill");
    const terminalLogs = document.getElementById("terminalLogs");

    if (startHuntBtn) {
        startHuntBtn.addEventListener("click", async () => {
            if (startHuntBtn.classList.contains("running")) {
                return;
            }

            try {
                consoleBody.style.display = "block";
                terminalLogs.innerHTML = `<div class="log-line text-info">> Initializing AI Agent...</div>`;
                progressBarFill.style.width = "0%";
                setConsoleStatus("searching");
                startHuntBtn.classList.add("running");
                startHuntBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Hunting...`;

                addLogLine("Fetching profile and preferences from database...");
                const res = await fetch(`${window.API_BASE}/users/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = await res.json();
                
                if (!res.ok) throw new Error(userData.message || "Failed to load preferences.");
                const profile = userData.user;

                const roles = profile.prefRoles || [];
                const locations = profile.prefLocations || [];
                
                if (roles.length === 0 && locations.length === 0) {
                    addLogLine("Error: No preferences found. Please configure your Preferences page.", "text-danger");
                    setConsoleStatus("idle");
                    startHuntBtn.classList.remove("running");
                    startHuntBtn.innerHTML = `<i class="fa-solid fa-play"></i> Start Job Hunt`;
                    showToast("Please update your Job Preferences first!", "warning");
                    return;
                }

                const freshnessVal = document.getElementById("freshnessFilter").value;
                const workModeVal = document.getElementById("workModeFilter").value;
                const sortByVal = document.getElementById("sortByFilter").value;

                const prefWorkMode = profile.prefWorkMode || "Any";

                addLogLine(`Target Roles: ${roles.join(", ")}`);
                addLogLine(`Target Locations: ${locations.join(", ")}`);
                addLogLine(`Preferred Work Mode: ${prefWorkMode}`);
                addLogLine(`Experience level: ${profile.prefExperience || "Any"}`);
                addLogLine(`Hunt Filters Applied: Date Freshness (Last ${freshnessVal} days), Work Mode (${workModeVal}), Sort (${sortByVal})`, "text-success");
                await sleep(1200);

                addLogLine("Cross-checking MongoDB database for strict company deduplication...", "text-warning");
                addLogLine(`Filtering job postings by freshness (<= ${freshnessVal} days old)...`, "text-info");
                addLogLine("Querying live job portals: WWR, RemoteOK, Arbeitnow, Remotive, Adzuna, Jooble & Direct Careers (Greenhouse/Lever)...", "text-info");
                await sleep(1500);

                const rolesParam = roles.join(",");
                const searchRes = await fetch(`${window.API_BASE}/jobs/live-search?roles=${encodeURIComponent(rolesParam)}&freshness=${freshnessVal}&workMode=${workModeVal}&sortBy=${sortByVal}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const searchData = await searchRes.json();
                
                if (!searchRes.ok) throw new Error(searchData.message || "Failed to search live jobs.");
                const liveJobs = searchData.jobs || [];

                if (searchData.searchNotice) {
                    addLogLine(searchData.searchNotice, "text-warning");
                }

                const matchedJobs = [];
                liveJobs.forEach(liveJob => {
                    if (liveJob.matchPercent !== undefined) {
                        matchedJobs.push({
                            ...liveJob,
                            matchedSkills: liveJob.matchedSkills || [],
                            missingSkills: liveJob.missingSkills || []
                        });
                    } else {
                        let score = 50; 
                        
                        const roleMatch = roles.some(role => 
                            liveJob.jobTitle.toLowerCase().includes(role.toLowerCase()) ||
                            role.toLowerCase().includes(liveJob.jobTitle.toLowerCase())
                        );
                        if (roleMatch) score += 30;

                        const locMatch = locations.some(loc => 
                            liveJob.location.toLowerCase().includes(loc.toLowerCase()) ||
                            loc.toLowerCase().includes(liveJob.location.toLowerCase())
                        ) || (liveJob.workMode === "Remote" && (prefWorkMode === "Remote" || prefWorkMode === "Any"));
                        
                        if (locMatch) score += 20;

                        matchedJobs.push({
                            ...liveJob,
                            matchPercent: Math.min(score, 98),
                            matchedSkills: [],
                            missingSkills: []
                        });
                    }
                });

                matchedJobs.sort((a, b) => b.matchPercent - a.matchPercent);

                if (matchedJobs.length === 0) {
                    addLogLine("No matching live jobs found. Try expanding your target job roles or locations.", "text-warning");
                    setConsoleStatus("done");
                    startHuntBtn.classList.remove("running");
                    startHuntBtn.innerHTML = `<i class="fa-solid fa-play"></i> Start Job Hunt`;
                    progressBarFill.style.width = "100%";
                    return;
                }

                addLogLine(`Found ${matchedJobs.length} potential matches. Processing applications...`, "text-info");
                await sleep(1200);

                let completed = 0;
                const total = matchedJobs.length;
                const pendingReviews = [];

                setConsoleStatus("applying");

                for (let i = 0; i < matchedJobs.length; i++) {
                    const job = matchedJobs[i];
                    addLogLine(`Processing [${job.company}] - ${job.jobTitle} (${job.matchPercent}% Match)`);
                    
                    completed++;
                    progressBarFill.style.width = `${Math.floor((completed / total) * 90)}%`; 
                    await sleep(1500);

                    if (job.isEasyApply) {
                        addLogLine(`Applying automatically via Easy Apply...`, "text-warning");
                        
                        const applicationData = {
                            company: job.company,
                            jobTitle: job.jobTitle,
                            location: job.location,
                            status: "Applied",
                            appliedDate: new Date().toISOString().split("T")[0],
                            jobLink: job.link,
                            workMode: job.workMode,
                            employmentType: job.employmentType,
                            experience: parseInt(profile.experience) || 0,
                            salary: parseInt(job.salary) || 0
                        };

                        try {
                            const postRes = await fetch(`${window.API_BASE}/jobs`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify(applicationData)
                            });

                            if (!postRes.ok) throw new Error("API error");

                            addLogLine(`✅ Application submitted to ${job.company}!`, "text-success");
                            showToast(`Applied to ${job.company} successfully!`, "success");
                        } catch (err) {
                            addLogLine(`❌ Failed to auto-apply to ${job.company}. Saved for manual check.`, "text-danger");
                            pendingReviews.push(job);
                        }
                    } else {
                        addLogLine(`⚠️ Manual submission required (Careers Portal redirect).`, "text-warning");
                        pendingReviews.push(job);
                    }
                    await sleep(800);
                }

                if (pendingReviews.length > 0) {
                    localStorage.setItem("pendingReviews", JSON.stringify(pendingReviews));
                    pushNotification(`🎉 Job Agent matched ${total} roles! ${total - pendingReviews.length} applied automatically, and ${pendingReviews.length} require manual review.`);
                    addLogLine(`\nSearch finished. ${total - pendingReviews.length} jobs applied. ${pendingReviews.length} jobs require manual review.`, "text-info");
                    await sleep(1000);
                    addLogLine(`Redirecting to Review page in 3 seconds...`, "text-warning");
                    progressBarFill.style.width = "100%";
                    setConsoleStatus("done");
                    await sleep(3000);
                    window.location.href = "review.html";
                } else {
                    pushNotification(`🎉 Job Agent successfully found and automatically applied to all ${total} matching roles!`);
                    addLogLine(`\nSearch finished! Successfully applied to all ${total} jobs.`, "text-success");
                    progressBarFill.style.width = "100%";
                    setConsoleStatus("done");
                    startHuntBtn.classList.remove("running");
                    startHuntBtn.innerHTML = `<i class="fa-solid fa-play"></i> Start Job Hunt`;
                    loadJobApplications();
                }

            } catch (err) {
                addLogLine(`Error during job hunt: ${err.message}`, "text-danger");
                setConsoleStatus("idle");
                startHuntBtn.classList.remove("running");
                startHuntBtn.innerHTML = `<i class="fa-solid fa-play"></i> Start Job Hunt`;
                if (window.showToast) {
                    window.showToast(err.message, "error");
                }
            }
        });
    }

    function addLogLine(text, className = "") {
        const line = document.createElement("div");
        line.className = `log-line ${className}`;
        line.textContent = `> ${text}`;
        terminalLogs.appendChild(line);
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
    }

    function setConsoleStatus(status) {
        consoleStatusVal.className = `status-${status}`;
        consoleStatusVal.textContent = status;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Load jobs when dashboard opens
    loadJobApplications();
}

// ==========================================
// Toast Helper
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
// Load Job Applications function (Global Scope)
// ==========================================
async function loadJobApplications() {
    try {
        const searchInput = document.getElementById("searchInput");
        const searchValue = searchInput ? searchInput.value.trim() : "";
        
        const response = await fetch(
            `${window.API_BASE}/jobs?search=${encodeURIComponent(searchValue)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Dashboard Statistics
        loadDashboardStats();

        const tableBody = document.getElementById("applicationsTableBody");
        if (tableBody) {
            tableBody.innerHTML = "";

            if (data.jobs.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fa-regular fa-folder-open"></i>
                            <p>No job applications found.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            data.jobs
                .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
                .slice(0, 5)
                .forEach(job => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${job.company}</td>
                            <td>${job.jobTitle}</td>
                            <td><span class="status-badge ${job.status.toLowerCase()}">${job.status}</span></td>
                            <td>${new Date(job.appliedDate).toLocaleDateString()}</td>
                        </tr>
                    `;
                });
        }

    } catch (error) {
        console.error("Error loading job applications:", error);
        const tableBody = document.getElementById("applicationsTableBody");
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state" style="text-align: center; padding: 40px 20px;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #F59E0B; margin-bottom: 12px; display: block;"></i>
                        <p style="color: var(--text);">Failed to load recent applications.</p>
                    </td>
                </tr>
            `;
        }
    }
}

let activityChartInstance = null;

async function loadDashboardStats() {
    try {
        const response = await fetch(`${window.API_BASE}/dashboard`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Cache weekly stats for modal report
        weeklyStatsData = data;

        // Update stats card DOM elements using the API counts
        const totalApplicationsEl = document.getElementById("totalApplications");
        if (totalApplicationsEl) {
            totalApplicationsEl.textContent = data.totalJobs;
        }

        const interviewCountEl = document.getElementById("interviewCount");
        if (interviewCountEl) {
            interviewCountEl.textContent = data.interview;
        }

        const offerCountEl = document.getElementById("offerCount");
        if (offerCountEl) {
            offerCountEl.textContent = data.selected;
        }

        const rejectedCountEl = document.getElementById("rejectedCount");
        if (rejectedCountEl) {
            rejectedCountEl.textContent = data.rejected;
        }

        // Draw / Update Chart.js Activity graph
        const skeleton = document.getElementById("chartSkeleton");
        if (skeleton) skeleton.style.display = "none";

        const canvas = document.getElementById("activityChart");
        if (!canvas) return;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d");
        const dates = data.timeline.map(t => {
            const dateObj = new Date(t.date);
            return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        const counts = data.timeline.map(t => t.count);

        if (activityChartInstance) {
            activityChartInstance.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.45)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");

        activityChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: dates,
                datasets: [{
                    label: "Applications Sent",
                    data: counts,
                    borderColor: "#3b82f6",
                    borderWidth: 3,
                    pointBackgroundColor: "#3b82f6",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: "#1e293b",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(226, 232, 240, 0.12)"
                        },
                        ticks: {
                            stepSize: 1,
                            color: "#94a3b8"
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: "#94a3b8",
                            maxRotation: 0,
                            minRotation: 0
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        const skeleton = document.getElementById("chartSkeleton");
        if (skeleton) skeleton.style.display = "none";
        const canvas = document.getElementById("activityChart");
        if (canvas) canvas.style.display = "block";
        
        // Reset count elements to 0
        ["totalApplications", "interviewCount", "offerCount", "rejectedCount"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "0";
        });
    }
}