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
const REVIEW_SERVER_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE.replace("/api", "") : window.API_BASE) : "http://localhost:5000";

// Page State Variables
let pendingQueue = [];
let activeIndex = 0;
let userProfile = null;

// Helper to format/truncate very long or multiple locations
function formatLocation(locStr) {
    if (!locStr) return "Remote";
    // Check for comma or semicolon delimited lists
    const delimiters = [";", ","];
    let locs = [];
    for (const d of delimiters) {
        if (locStr.includes(d)) {
            locs = locStr.split(d).map(l => l.trim()).filter(Boolean);
            break;
        }
    }
    if (locs.length > 2) {
        return `${locs[0]} + ${locs.length - 1} locations`;
    }
    return locStr;
}

// DOM Elements
const queueContainer = document.getElementById("queueContainer");
const emptyQueueContainer = document.getElementById("emptyQueueContainer");
const queueList = document.getElementById("queueList");

// Detail panel elements
const detRole = document.getElementById("detRole");
const detCompany = document.getElementById("detCompany");
const detLocation = document.getElementById("detLocation");
const detMatch = document.getElementById("detMatch");
const detWorkMode = document.getElementById("detWorkMode");
const detType = document.getElementById("detType");
const detSalary = document.getElementById("detSalary");
const detLink = document.getElementById("detLink");
const openPortalBtn = document.getElementById("openPortalBtn");

// Copy board elements
const copyName = document.getElementById("copyName");
const copyPhone = document.getElementById("copyPhone");
const copyEdu = document.getElementById("copyEdu");
const copySkills = document.getElementById("copySkills");
const copyLinkedin = document.getElementById("copyLinkedin");
const copyResume = document.getElementById("copyResume");

// Actions
const skipBtn = document.getElementById("skipBtn");
const markAppliedBtn = document.getElementById("markAppliedBtn");
const notInterestedBtn = document.getElementById("notInterestedBtn");

// Mobile menu toggle
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Logout button
const logoutBtn = document.getElementById("logoutBtn");

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
// Copy to Clipboard Utility (Global Scope)
// ==========================================
window.copyText = function (elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const textToCopy = element.innerText || element.textContent;

    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast("Copied to clipboard!", "success");
        })
        .catch(err => {
            showToast("Failed to copy text.", "error");
        });
};

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
// Initialisation & Fetch profile
// ==========================================
async function initReviewPage() {
    try {
        // 1. Fetch profile to populate Copy Board
        const profileRes = await fetch(`${API_BASE}/users/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const profileData = await profileRes.json();

        if (!profileRes.ok) {
            throw new Error(profileData.message || "Failed to load profile.");
        }

        userProfile = profileData.user;

        // Set topbar displays
        document.getElementById("profileName").textContent = (userProfile.name || "").split(" ")[0];
        const avatarEl = document.getElementById("profileAvatar");
        setAvatarDisplay(avatarEl, userProfile.avatar, userProfile.name);

        // Load Copy Board details
        copyName.textContent = userProfile.name || "";
        copyPhone.textContent = userProfile.phone || "Not set";
        copyEdu.textContent = userProfile.education || "Not set";
        copySkills.textContent = userProfile.skills ? userProfile.skills.join(", ") : "Not set";
        copyLinkedin.textContent = userProfile.linkedin || "Not set";
        copyResume.textContent = userProfile.resume 
            ? `${REVIEW_SERVER_BASE}/uploads/resumes/${userProfile.resume}` 
            : "No resume uploaded";

        // 2. Load pending queue from localStorage
        const storedQueue = localStorage.getItem("pendingReviews");
        if (storedQueue) {
            pendingQueue = JSON.parse(storedQueue);
        }

        renderQueue();

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================
// Match Badge Colour Helper
// ==========================================
function getMatchClass(percent) {
    if (percent >= 80) return "match-high";
    if (percent >= 60) return "match-mid";
    return "match-low";
}

// ==========================================
// Render Queue UI
// ==========================================
function renderQueue() {
    if (pendingQueue.length === 0) {
        queueContainer.style.display = "none";
        emptyQueueContainer.style.display = "block";
        return;
    }

    queueContainer.style.display = "grid";
    emptyQueueContainer.style.display = "none";

    // Re-adjust active index bounds
    if (activeIndex >= pendingQueue.length) {
        activeIndex = pendingQueue.length - 1;
    }
    if (activeIndex < 0) {
        activeIndex = 0;
    }

    // Populate Left sidebar queue list
    queueList.innerHTML = "";
    pendingQueue.forEach((job, idx) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = `queue-item ${idx === activeIndex ? 'active' : ''}`;
        const displayLocation = formatLocation(job.location);
        const matchClass = getMatchClass(job.matchPercent);
        itemDiv.innerHTML = `
            <div class="queue-item-header">
                <h4>${job.jobTitle}</h4>
                <span class="match-badge ${matchClass}">${job.matchPercent}% Match</span>
            </div>
            <p class="company-name">${job.company}</p>
            <p class="location-text"><i class="fa-solid fa-location-dot"></i> ${displayLocation}</p>
        `;

        itemDiv.addEventListener("click", () => {
            activeIndex = idx;
            renderQueue();
        });

        queueList.appendChild(itemDiv);
    });

    // Populate Right active details
    const activeJob = pendingQueue[activeIndex];
    detRole.textContent = activeJob.jobTitle;
    detCompany.textContent = activeJob.company;
    detLocation.textContent = formatLocation(activeJob.location);

    // Colour-coded match badge
    const matchPct = activeJob.matchPercent || 0;
    const matchClass = getMatchClass(matchPct);
    detMatch.textContent = `${matchPct}% Match`;
    detMatch.className = `detail-match-tag ${matchClass}`;

    detWorkMode.textContent = activeJob.workMode || "Onsite";
    detType.textContent = activeJob.employmentType || "Full-time";
    detSalary.textContent = activeJob.salary ? `${activeJob.salary} LPA` : "Not specified";
    detLink.textContent = activeJob.link;
    openPortalBtn.href = activeJob.link;

    // Show real content, hide skeleton
    const skeleton = document.getElementById("detailSkeleton");
    const content = document.getElementById("detailContent");
    if (skeleton) skeleton.style.display = "none";
    if (content)  content.style.display  = "flex";
    if (content)  content.style.flexDirection = "column";
    if (content)  content.style.gap = "22px";

    // Render Matched & Missing Skills
    const diagnosticsContainer = document.getElementById("skillsMatchDiagnostics");
    const matchedContainer = document.getElementById("detMatchedSkills");
    const missingContainer = document.getElementById("detMissingSkills");

    if (diagnosticsContainer && matchedContainer && missingContainer) {
        matchedContainer.innerHTML = "";
        missingContainer.innerHTML = "";

        const matched = activeJob.matchedSkills || [];
        const missing = activeJob.missingSkills || [];

        if (matched.length > 0 || missing.length > 0) {
            diagnosticsContainer.style.display = "block";
            
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
            diagnosticsContainer.style.display = "none";
        }
    }
}

// ==========================================
// Skip Event Listener
// ==========================================
if (skipBtn) {
    skipBtn.addEventListener("click", () => {
        if (pendingQueue.length === 0) return;

        pendingQueue.splice(activeIndex, 1);
        localStorage.setItem("pendingReviews", JSON.stringify(pendingQueue));
        showToast("Role skipped.", "warning");
        renderQueue();
    });
}

// ==========================================
// Not Interested Event Listener
// ==========================================
if (notInterestedBtn) {
    notInterestedBtn.addEventListener("click", async () => {
        if (pendingQueue.length === 0) return;

        const activeJob = pendingQueue[activeIndex];

        try {
            notInterestedBtn.disabled = true;
            notInterestedBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

            const res = await fetch(`${API_BASE}/users/block-job`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ link: activeJob.link })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to block job.");
            }

            showToast("Marked as Not Interested. This role will not be fetched again.", "success");

            // Remove from local review queue
            pendingQueue.splice(activeIndex, 1);
            localStorage.setItem("pendingReviews", JSON.stringify(pendingQueue));

            notInterestedBtn.disabled = false;
            notInterestedBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Not Interested`;

            renderQueue();

        } catch (err) {
            showToast(err.message, "error");
            notInterestedBtn.disabled = false;
            notInterestedBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Not Interested`;
        }
    });
}

// ==========================================
// Mark as Applied Event Listener
// ==========================================
if (markAppliedBtn) {
    markAppliedBtn.addEventListener("click", async () => {
        if (pendingQueue.length === 0) return;

        const activeJob = pendingQueue[activeIndex];

        // Format for DB post
        const applicationData = {
            company: activeJob.company,
            jobTitle: activeJob.jobTitle,
            location: activeJob.location,
            status: "Applied",
            appliedDate: new Date().toISOString().split("T")[0],
            jobLink: activeJob.link,
            workMode: activeJob.workMode,
            employmentType: activeJob.employmentType,
            experience: parseInt(userProfile.experience) || 0,
            salary: parseInt(activeJob.salary) || 0
        };

        try {
            markAppliedBtn.disabled = true;
            markAppliedBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

            const res = await fetch(`${API_BASE}/jobs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(applicationData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to log application.");
            }

            showToast(`Logged application for ${activeJob.company}!`, "success");

            // Remove from queue
            pendingQueue.splice(activeIndex, 1);
            localStorage.setItem("pendingReviews", JSON.stringify(pendingQueue));

            markAppliedBtn.disabled = false;
            markAppliedBtn.innerHTML = `<i class="fa-solid fa-check"></i> Mark as Applied`;

            renderQueue();

        } catch (err) {
            showToast(err.message, "error");
            markAppliedBtn.disabled = false;
            markAppliedBtn.innerHTML = `<i class="fa-solid fa-check"></i> Mark as Applied`;
        }
    });
}

// ==========================================
// Greenhouse Application Simulator Logic
// ==========================================
const simulatorModal = document.getElementById("simulatorModal");
const closeSimulatorBtn = document.getElementById("closeSimulatorBtn");
const startSimBtn = document.getElementById("startSimBtn");
const autofillBtn = document.getElementById("autofillBtn");
const simSubmitBtn = document.getElementById("simSubmitBtn");
const simulatedForm = document.getElementById("simulatedForm");

// Form fields
const simRole = document.getElementById("simRole");
const simCompany = document.getElementById("simCompany");
const simName = document.getElementById("simName");
const simEmail = document.getElementById("simEmail");
const simPhone = document.getElementById("simPhone");
const simResumeText = document.getElementById("simResumeText");
const simResumeBox = document.getElementById("simResumeBox");
const simLinkedin = document.getElementById("simLinkedin");
const simAuthYes = document.getElementById("simAuthYes");
const simAuthNo = document.getElementById("simAuthNo");
const simSponsYes = document.getElementById("simSponsYes");
const simSponsNo = document.getElementById("simSponsNo");
const simQ = document.getElementById("simQ");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const typeIntoInput = async (inputEl, text, speed = 25) => {
    inputEl.value = "";
    for (let i = 0; i < text.length; i++) {
        inputEl.value += text[i];
        await sleep(speed);
    }
};

// Open Simulator Modal
if (autofillBtn) {
    autofillBtn.addEventListener("click", () => {
        if (pendingQueue.length === 0) return;
        const activeJob = pendingQueue[activeIndex];

        // Populate header details
        simRole.textContent = activeJob.jobTitle;
        simCompany.textContent = activeJob.company;

        // Reset form inputs
        simName.value = "";
        simEmail.value = "";
        simPhone.value = "";
        simResumeText.innerHTML = "Resume file not selected";
        simResumeBox.style.borderColor = "var(--border)";
        simLinkedin.value = "";
        simAuthYes.checked = false;
        simAuthNo.checked = false;
        simSponsYes.checked = false;
        simSponsNo.checked = false;
        simQ.value = "";

        // Reset field active borders
        document.querySelectorAll(".sim-field-group").forEach(el => el.classList.remove("active"));

        // Reset buttons
        startSimBtn.disabled = false;
        startSimBtn.innerHTML = `<i class="fa-solid fa-play"></i> Start Auto-fill`;
        simSubmitBtn.disabled = true;
        simSubmitBtn.style.opacity = "0.6";
        simSubmitBtn.style.cursor = "not-allowed";

        // Show modal
        simulatorModal.style.display = "flex";
    });
}

// Close Simulator Modal
if (closeSimulatorBtn) {
    closeSimulatorBtn.addEventListener("click", () => {
        simulatorModal.style.display = "none";
    });
}

// Click outside modal to close
if (simulatorModal) {
    simulatorModal.addEventListener("click", (e) => {
        if (e.target === simulatorModal) {
            simulatorModal.style.display = "none";
        }
    });
}

// Auto-fill animation loop
if (startSimBtn) {
    startSimBtn.addEventListener("click", async () => {
        if (!userProfile) return;
        const activeJob = pendingQueue[activeIndex];

        startSimBtn.disabled = true;
        startSimBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Auto-filling...`;

        // Step 1: Type Name
        const groupName = document.getElementById("groupSimName");
        groupName.classList.add("active");
        groupName.scrollIntoView({ behavior: "smooth", block: "nearest" });
        await typeIntoInput(simName, userProfile.name || "John Doe");
        await sleep(400);
        groupName.classList.remove("active");

        // Step 2: Type Email
        const groupEmail = document.getElementById("groupSimEmail");
        groupEmail.classList.add("active");
        groupEmail.scrollIntoView({ behavior: "smooth", block: "nearest" });
        await typeIntoInput(simEmail, userProfile.email || "johndoe@example.com");
        await sleep(400);
        groupEmail.classList.remove("active");

        // Step 3: Type Phone
        const groupPhone = document.getElementById("groupSimPhone");
        groupPhone.classList.add("active");
        groupPhone.scrollIntoView({ behavior: "smooth", block: "nearest" });
        await typeIntoInput(simPhone, userProfile.phone || "123-456-7890");
        await sleep(400);
        groupPhone.classList.remove("active");

        // Step 4: Upload Resume (spinner simulation)
        const groupResume = document.getElementById("groupSimResume");
        groupResume.classList.add("active");
        groupResume.scrollIntoView({ behavior: "smooth", block: "nearest" });
        simResumeText.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--primary)"></i> Auto-uploading PDF resume...`;
        await sleep(1200);
        const fileName = userProfile.resume || "test_resume.pdf";
        simResumeText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.1rem; margin-right: 5px;"></i> <strong>${fileName}</strong> uploaded successfully!`;
        simResumeBox.style.borderColor = "var(--success)";
        await sleep(400);
        groupResume.classList.remove("active");

        // Step 5: Type LinkedIn
        const groupLinkedin = document.getElementById("groupSimLinkedin");
        groupLinkedin.classList.add("active");
        groupLinkedin.scrollIntoView({ behavior: "smooth", block: "nearest" });
        await typeIntoInput(simLinkedin, userProfile.linkedin || "linkedin.com/in/johndoe");
        await sleep(400);
        groupLinkedin.classList.remove("active");

        // Step 6: Toggle Authorization
        const groupAuth = document.getElementById("groupSimAuth");
        groupAuth.classList.add("active");
        groupAuth.scrollIntoView({ behavior: "smooth", block: "nearest" });
        await sleep(400);
        simAuthYes.checked = true;
        await sleep(400);
        groupAuth.classList.remove("active");

        // Step 7: Toggle Sponsorship
        const groupSpons = document.getElementById("groupSimSpons");
        groupSpons.classList.add("active");
        groupSpons.scrollIntoView({ behavior: "smooth", block: "nearest" });
        await sleep(400);
        simSponsNo.checked = true;
        await sleep(400);
        groupSpons.classList.remove("active");

        // Step 8: Type Custom Question answer (AI-drafted or Template Fallback)
        const groupQ = document.getElementById("groupSimQ");
        groupQ.classList.add("active");
        groupQ.scrollIntoView({ behavior: "smooth", block: "nearest" });
        
        simQ.value = "AI Agent: Drafting personalized response...";
        
        let draftedAnswer = "";
        try {
            const draftRes = await fetch(`${window.API_BASE}/jobs/draft-answer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: "Why are you interested in this position?",
                    jobTitle: activeJob.jobTitle,
                    company: activeJob.company,
                    description: activeJob.description || ""
                })
            });
            
            const draftData = await draftRes.json();
            if (draftRes.ok && draftData.success) {
                draftedAnswer = draftData.answer;
            }
        } catch (err) {
            console.error("AI drafting failed, using fallback:", err);
        }
        
        if (!draftedAnswer) {
            const skills = userProfile.skills && userProfile.skills.length > 0 
                ? userProfile.skills.slice(0, 3).join(", ") 
                : "technical skills and experience";
            draftedAnswer = `I am very excited about the ${activeJob.jobTitle} position at ${activeJob.company}. With my background in software development and specific expertise in ${skills}, I believe I can make an immediate contribution to your engineering objectives. I am highly motivated by your product mission and eager to bring my problem-solving skills to your team.`;
        }
        
        await typeIntoInput(simQ, draftedAnswer, 12);
        await sleep(400);
        groupQ.classList.remove("active");

        // End of Auto-fill
        startSimBtn.innerHTML = `<i class="fa-solid fa-check"></i> Auto-filled!`;
        showToast("Auto-fill completed successfully!", "success");

        // Enable Submit button
        simSubmitBtn.disabled = false;
        simSubmitBtn.style.opacity = "1";
        simSubmitBtn.style.cursor = "pointer";
    });
}

// Simulated Form Submit Handler
if (simulatedForm) {
    simulatedForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (pendingQueue.length === 0) return;

        const activeJob = pendingQueue[activeIndex];

        // Format for DB post
        const applicationData = {
            company: activeJob.company,
            jobTitle: activeJob.jobTitle,
            location: activeJob.location,
            status: "Applied",
            appliedDate: new Date().toISOString().split("T")[0],
            jobLink: activeJob.link,
            workMode: activeJob.workMode,
            employmentType: activeJob.employmentType,
            experience: parseInt(userProfile.experience) || 0,
            salary: parseInt(activeJob.salary) || 0
        };

        try {
            simSubmitBtn.disabled = true;
            simSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;

            const res = await fetch(`${API_BASE}/jobs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(applicationData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to submit application.");
            }

            showToast(`✅ Greenhouse Application Submitted to ${activeJob.company}!`, "success");

            // Close modal
            simulatorModal.style.display = "none";

            // Remove from queue
            pendingQueue.splice(activeIndex, 1);
            localStorage.setItem("pendingReviews", JSON.stringify(pendingQueue));

            renderQueue();

        } catch (err) {
            showToast(err.message, "error");
            simSubmitBtn.disabled = false;
            simSubmitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Application`;
        }
    });
}

// ==========================================
// Cover Letter Generator Modal Logic
// ==========================================
const coverLetterBtn = document.getElementById("coverLetterBtn");
const coverLetterModal = document.getElementById("coverLetterModal");
const closeCoverLetterBtn = document.getElementById("closeCoverLetterBtn");
const coverLetterLoader = document.getElementById("coverLetterLoader");
const coverLetterArea = document.getElementById("coverLetterArea");
const coverLetterText = document.getElementById("coverLetterText");
const copyCoverLetterBtn = document.getElementById("copyCoverLetterBtn");
const downloadCoverLetterBtn = document.getElementById("downloadCoverLetterBtn");

if (coverLetterBtn) {
    coverLetterBtn.addEventListener("click", async () => {
        if (pendingQueue.length === 0) return;
        const activeJob = pendingQueue[activeIndex];

        // Reset UI states inside modal
        coverLetterLoader.style.display = "flex";
        coverLetterArea.style.display = "none";
        coverLetterText.value = "";

        // Show modal
        coverLetterModal.style.display = "flex";

        try {
            const res = await fetch(`${API_BASE}/jobs/draft-cover-letter`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobTitle: activeJob.jobTitle,
                    company: activeJob.company,
                    description: activeJob.description || ""
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to generate cover letter.");

            // Display text
            coverLetterText.value = data.coverLetter;
            coverLetterLoader.style.display = "none";
            coverLetterArea.style.display = "flex";

        } catch (err) {
            showToast(err.message, "error");
            coverLetterModal.style.display = "none";
        }
    });
}

// Close Modal
if (closeCoverLetterBtn) {
    closeCoverLetterBtn.addEventListener("click", () => {
        coverLetterModal.style.display = "none";
    });
}

if (coverLetterModal) {
    coverLetterModal.addEventListener("click", (e) => {
        if (e.target === coverLetterModal) {
            coverLetterModal.style.display = "none";
        }
    });
}

// Copy to clipboard
if (copyCoverLetterBtn) {
    copyCoverLetterBtn.addEventListener("click", () => {
        const text = coverLetterText.value;
        if (!text) return;

        navigator.clipboard.writeText(text)
            .then(() => {
                showToast("Cover letter copied to clipboard!", "success");
            })
            .catch(err => {
                showToast("Failed to copy cover letter.", "error");
            });
    });
}

// Download cover letter as file
if (downloadCoverLetterBtn) {
    downloadCoverLetterBtn.addEventListener("click", () => {
        const text = coverLetterText.value;
        if (!text) return;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        // Clean company name for filename
        const activeJob = pendingQueue[activeIndex];
        const safeCompany = activeJob ? activeJob.company.replace(/[^a-z0-9]/gi, '_') : 'Company';
        
        a.href = url;
        a.download = `Cover_Letter_${safeCompany}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast("Cover letter download started!", "success");
    });
}

// ==========================================
// Resume Advisor Modal Logic
// ==========================================
const resumeAdvisorBtn = document.getElementById("resumeAdvisorBtn");
const resumeAdvisorModal = document.getElementById("resumeAdvisorModal");
const closeResumeAdvisorBtn = document.getElementById("closeResumeAdvisorBtn");
const resumeAdvisorLoader = document.getElementById("resumeAdvisorLoader");
const resumeAdvisorArea = document.getElementById("resumeAdvisorArea");
const advisorScoreRing = document.getElementById("advisorScoreRing");
const advisorScoreVal = document.getElementById("advisorScoreVal");
const advisorKeywordsCloud = document.getElementById("advisorKeywordsCloud");
const advisorSuggestionsList = document.getElementById("advisorSuggestionsList");

if (resumeAdvisorBtn) {
    resumeAdvisorBtn.addEventListener("click", async () => {
        if (pendingQueue.length === 0) return;
        const activeJob = pendingQueue[activeIndex];

        // Reset UI states inside modal
        resumeAdvisorLoader.style.display = "flex";
        resumeAdvisorArea.style.display = "none";
        advisorKeywordsCloud.innerHTML = "";
        advisorSuggestionsList.innerHTML = "";

        // Show modal
        resumeAdvisorModal.style.display = "flex";

        try {
            const res = await fetch(`${API_BASE}/jobs/resume-advice`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobTitle: activeJob.jobTitle,
                    company: activeJob.company,
                    description: activeJob.description || ""
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to fetch resume advice.");

            const advice = data.advice;

            // Update Score Ring angle and text
            const angle = (advice.score / 100) * 360;
            advisorScoreRing.style.background = `conic-gradient(#0D9488 ${angle}deg, #E2E8F0 0deg)`;
            advisorScoreVal.textContent = `${advice.score}%`;

            // Populate Missing Keywords tag cloud
            if (advice.missingKeywords && advice.missingKeywords.length > 0) {
                advice.missingKeywords.forEach(keyword => {
                    const tag = document.createElement("span");
                    tag.style.cssText = "background: #FEE2E2; color: #EF4444; border: 1px solid #FCA5A5; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s;";
                    tag.innerHTML = `<i class="fa-solid fa-circle-plus"></i> ${keyword}`;
                    
                    // Add click toggle to mark as added/resolved
                    tag.addEventListener("click", () => {
                        if (tag.style.background.includes("FEE2E2") || tag.style.backgroundColor.includes("rgb(254, 226, 226)")) {
                            tag.style.background = "#DCFCE7";
                            tag.style.color = "#15803D";
                            tag.style.borderColor = "#86EFAC";
                            tag.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${keyword}`;
                        } else {
                            tag.style.background = "#FEE2E2";
                            tag.style.color = "#EF4444";
                            tag.style.borderColor = "#FCA5A5";
                            tag.innerHTML = `<i class="fa-solid fa-circle-plus"></i> ${keyword}`;
                        }
                    });
                    
                    advisorKeywordsCloud.appendChild(tag);
                });
            } else {
                advisorKeywordsCloud.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-light);">No missing critical keywords detected! Excellent.</span>`;
            }

            // Populate recommendations list
            if (advice.suggestions && advice.suggestions.length > 0) {
                advice.suggestions.forEach(suggestion => {
                    const li = document.createElement("li");
                    li.style.cssText = "list-style: none; position: relative; padding-left: 20px; color: var(--text);";
                    li.innerHTML = `<i class="fa-solid fa-circle-notch" style="position: absolute; left: 0; top: 3px; color: #F59E0B;"></i> ${suggestion}`;
                    advisorSuggestionsList.appendChild(li);
                });
            } else {
                advisorSuggestionsList.innerHTML = `<li style="list-style: none; color: var(--text-light);">No improvements suggested. Your resume format matches requirements!</li>`;
            }

            // Display panel
            resumeAdvisorLoader.style.display = "none";
            resumeAdvisorArea.style.display = "flex";

        } catch (err) {
            showToast(err.message, "error");
            resumeAdvisorModal.style.display = "none";
        }
    });
}

// Close Modal
if (closeResumeAdvisorBtn) {
    closeResumeAdvisorBtn.addEventListener("click", () => {
        resumeAdvisorModal.style.display = "none";
    });
}

if (resumeAdvisorModal) {
    resumeAdvisorModal.addEventListener("click", (e) => {
        if (e.target === resumeAdvisorModal) {
            resumeAdvisorModal.style.display = "none";
        }
    });
}

// ==========================================
// Interview Prep Modal Logic
// ==========================================
const interviewPrepBtn = document.getElementById("interviewPrepBtn");
const interviewPrepModal = document.getElementById("interviewPrepModal");
const closeInterviewPrepBtn = document.getElementById("closeInterviewPrepBtn");
const interviewPrepLoader = document.getElementById("interviewPrepLoader");
const interviewPrepArea = document.getElementById("interviewPrepArea");
const interviewPrepAccordion = document.getElementById("interviewPrepAccordion");
const copyInterviewPrepBtn = document.getElementById("copyInterviewPrepBtn");

let currentPrepData = [];

if (interviewPrepBtn) {
    interviewPrepBtn.addEventListener("click", async () => {
        if (pendingQueue.length === 0) return;
        const activeJob = pendingQueue[activeIndex];

        // Reset UI states inside modal
        interviewPrepLoader.style.display = "flex";
        interviewPrepArea.style.display = "none";
        interviewPrepAccordion.innerHTML = "";

        // Show modal
        interviewPrepModal.style.display = "flex";

        try {
            const res = await fetch(`${API_BASE}/jobs/interview-prep`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobTitle: activeJob.jobTitle,
                    company: activeJob.company,
                    description: activeJob.description || ""
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to generate interview questions.");

            currentPrepData = data.interviewPrep.questions || [];

            // Populate Accordion Cards
            currentPrepData.forEach((qObj, i) => {
                const card = document.createElement("div");
                card.style.cssText = "border: 1px solid var(--border); border-radius: 10px; background: #F8FAFC; overflow: hidden; transition: all 0.2s; margin-bottom: 10px;";
                
                // Color badge based on category
                let badgeColor = "#6366F1";
                if (qObj.category.toLowerCase().includes("behavioral")) badgeColor = "#0D9488";
                if (qObj.category.toLowerCase().includes("system")) badgeColor = "#D97706";
                if (qObj.category.toLowerCase().includes("technical")) badgeColor = "#2563EB";

                card.innerHTML = `
                    <div class="qa-header" style="padding: 14px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-weight: 600; font-size: 0.92rem; color: var(--text);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">${qObj.category}</span>
                            <span>Q${i+1}: ${qObj.question}</span>
                        </div>
                        <i class="fa-solid fa-chevron-down toggle-icon" style="transition: transform 0.3s; color: var(--text-light); flex-shrink: 0;"></i>
                    </div>
                    <div class="qa-body" style="display: none; padding: 0 16px 14px 16px; border-top: 1px dashed var(--border); background: var(--white); font-size: 0.88rem; line-height: 1.5; color: var(--text);">
                        <p style="margin: 10px 0 0 0; font-weight: 600; color: #6366F1;"><i class="fa-solid fa-square-check"></i> Sample Winning Answer:</p>
                        <p style="margin: 6px 0 15px 0; color: var(--text);">${qObj.answer}</p>
                        
                        <!-- Collapsible Practice Response Area -->
                        <div class="practice-container" style="border-top: 1px dashed var(--border); padding-top: 12px; margin-top: 10px;">
                            <h5 style="margin: 0 0 8px 0; font-size: 0.84rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-microphone-lines" style="color: #6366F1;"></i> Mock Interview Practice Panel
                            </h5>
                            <textarea class="practice-ans-text" placeholder="Type your answer here to get an instant AI review..." rows="3" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.82rem; box-sizing: border-box; resize: none; background: #F8FAFC; color: var(--text);"></textarea>
                            
                            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                                <button class="btn-analyze" style="background: #6366F1; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.78rem; display: flex; align-items: center; gap: 6px;">
                                    <i class="fa-solid fa-circle-nodes"></i> Analyze Answer
                                </button>
                            </div>

                            <!-- Evaluation loader -->
                            <div class="practice-loader" style="display: none; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0; color: var(--text-light); font-size: 0.8rem;">
                                <i class="fa-solid fa-spinner fa-spin" style="color: #6366F1; font-size: 1.4rem;"></i>
                                <span>AI Recruiter is evaluating your performance...</span>
                            </div>

                            <!-- Evaluation feedback -->
                            <div class="practice-feedback" style="display: none; flex-direction: column; gap: 10px; margin-top: 12px; background: #F8FAFC; border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div class="score-badge" style="width: 38px; height: 38px; border-radius: 50%; font-weight: 700; font-size: 0.95rem; display: flex; justify-content: center; align-items: center;">8</div>
                                    <div>
                                        <h6 style="margin: 0; font-size: 0.84rem; font-weight: 700;">Performance Score</h6>
                                        <span style="font-size: 0.72rem; color: var(--text-light);">Graded on key competencies and keyword relevance.</span>
                                    </div>
                                </div>
                                <div class="strengths-list" style="font-size: 0.8rem; text-align: left;">
                                    <strong>Strengths:</strong>
                                    <ul style="margin: 4px 0 0 0; padding-left: 15px; display: flex; flex-direction: column; gap: 4px;"></ul>
                                </div>
                                <div class="weaknesses-list" style="font-size: 0.8rem; text-align: left;">
                                    <strong>Points to Improve:</strong>
                                    <ul style="margin: 4px 0 0 0; padding-left: 15px; display: flex; flex-direction: column; gap: 4px;"></ul>
                                </div>
                                <div class="polish-advice" style="font-size: 0.8rem; padding: 8px 10px; background: var(--white); border-radius: 6px; border-left: 3px solid #6366F1; text-align: left; line-height: 1.4;">
                                    <strong>Suggested Polish:</strong>
                                    <p style="margin: 4px 0 0 0; color: var(--text-light); font-style: italic;"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                const header = card.querySelector(".qa-header");
                const body = card.querySelector(".qa-body");
                const icon = card.querySelector(".toggle-icon");

                header.addEventListener("click", () => {
                    const isHidden = body.style.display === "none";
                    body.style.display = isHidden ? "block" : "none";
                    icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
                });

                // Set up practice evaluation triggers
                const analyzeBtn = card.querySelector(".btn-analyze");
                const textarea = card.querySelector(".practice-ans-text");
                const loader = card.querySelector(".practice-loader");
                const feedbackBox = card.querySelector(".practice-feedback");
                const scoreBadge = card.querySelector(".score-badge");
                const strengthsUl = card.querySelector(".strengths-list ul");
                const weaknessesUl = card.querySelector(".weaknesses-list ul");
                const polishText = card.querySelector(".polish-advice p");

                analyzeBtn.addEventListener("click", async () => {
                    const ans = textarea.value.trim();
                    if (!ans) {
                        showToast("Please write down your answer response first!", "warning");
                        return;
                    }

                    analyzeBtn.style.display = "none";
                    loader.style.display = "flex";
                    feedbackBox.style.display = "none";

                    try {
                        const feedbackRes = await fetch(`${API_BASE}/jobs/analyze-interview-answer`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                question: qObj.question,
                                expectedAnswer: qObj.answer,
                                userAnswer: ans
                            })
                        });

                        const fbData = await feedbackRes.json();
                        if (!feedbackRes.ok) throw new Error(fbData.message || "Failed to analyze response");

                        // Render metrics score
                        scoreBadge.innerText = `${fbData.score}/10`;
                        if (fbData.score >= 8) {
                            scoreBadge.style.background = "#DEF7EC";
                            scoreBadge.style.color = "#03543F";
                        } else if (fbData.score >= 5) {
                            scoreBadge.style.background = "#FEF3C7";
                            scoreBadge.style.color = "#92400E";
                        } else {
                            scoreBadge.style.background = "#FDE8E8";
                            scoreBadge.style.color = "#9B1C1C";
                        }

                        // Strengths list
                        strengthsUl.innerHTML = "";
                        (fbData.strengths || []).forEach(str => {
                            const li = document.createElement("li");
                            li.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #0E9F6E; margin-right: 6px;"></i> ${str}`;
                            li.style.listStyle = "none";
                            strengthsUl.appendChild(li);
                        });

                        // Weaknesses list
                        weaknessesUl.innerHTML = "";
                        (fbData.weaknesses || []).forEach(weak => {
                            const li = document.createElement("li");
                            li.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #E3A008; margin-right: 6px;"></i> ${weak}`;
                            li.style.listStyle = "none";
                            weaknessesUl.appendChild(li);
                        });

                        polishText.innerText = fbData.suggestedImprovement || "Your answer is well-structured! No custom suggestions.";

                        loader.style.display = "none";
                        feedbackBox.style.display = "flex";
                        analyzeBtn.style.display = "flex";

                    } catch (err) {
                        showToast(err.message, "error");
                        loader.style.display = "none";
                        analyzeBtn.style.display = "flex";
                    }
                });

                interviewPrepAccordion.appendChild(card);
            });

            // Display Panel
            interviewPrepLoader.style.display = "none";
            interviewPrepArea.style.display = "flex";

        } catch (err) {
            showToast(err.message, "error");
            interviewPrepModal.style.display = "none";
        }
    });
}

// Close Modal
if (closeInterviewPrepBtn) {
    closeInterviewPrepBtn.addEventListener("click", () => {
        interviewPrepModal.style.display = "none";
    });
}

if (interviewPrepModal) {
    interviewPrepModal.addEventListener("click", (e) => {
        if (e.target === interviewPrepModal) {
            interviewPrepModal.style.display = "none";
        }
    });
}

// Copy Q&A Set to Clipboard
if (copyInterviewPrepBtn) {
    copyInterviewPrepBtn.addEventListener("click", () => {
        if (!currentPrepData || currentPrepData.length === 0) return;

        const activeJob = pendingQueue[activeIndex];
        let fullGuide = `=== AI Interview Prep Guide: ${activeJob ? activeJob.jobTitle : ''} at ${activeJob ? activeJob.company : ''} ===\n\n`;
        
        currentPrepData.forEach((q, i) => {
            fullGuide += `[${q.category}] Q${i+1}: ${q.question}\nAnswer: ${q.answer}\n\n`;
        });

        navigator.clipboard.writeText(fullGuide)
            .then(() => showToast("Interview Prep Guide copied to clipboard!", "success"))
            .catch(() => showToast("Failed to copy interview guide.", "error"));
    });
}

// Initialise Page
document.addEventListener("DOMContentLoaded", initReviewPage);
