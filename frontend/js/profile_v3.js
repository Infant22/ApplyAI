// ==========================================
// Authentication Guard
// ==========================================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token || !user) {
    window.location.href = "login.html";
}

// Backend Server URL
const PROFILE_API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";
const PROFILE_SERVER_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE.replace("/api", "") : window.API_BASE) : "http://localhost:5000";

// DOM Elements
const profileForm = document.getElementById("profileForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const countryCodeSelect = document.getElementById("countryCode");
const customCountryCodeInput = document.getElementById("customCountryCode");

if (countryCodeSelect && customCountryCodeInput) {
    countryCodeSelect.addEventListener("change", () => {
        if (countryCodeSelect.value === "custom") {
            customCountryCodeInput.style.display = "inline-block";
            customCountryCodeInput.focus();
        } else {
            customCountryCodeInput.style.display = "none";
        }
    });
}

const educationInput = document.getElementById("education");
const experienceInput = document.getElementById("experience");
const skillsSelectBox = document.getElementById("skillsSelectBox");
const skillsOptionsContainer = document.getElementById("skillsOptionsContainer");
const portfolioInput = document.getElementById("portfolio");
const linkedinInput = document.getElementById("linkedin");
const githubInput = document.getElementById("github");
const currentTitleInput = document.getElementById("currentTitle");
const currentCompanyInput = document.getElementById("currentCompany");
const noticePeriodInput = document.getElementById("noticePeriod");
const expectedSalaryInput = document.getElementById("expectedSalary");
const requireSponsorshipInput = document.getElementById("requireSponsorship");

// Searchable Multiselect Dropdown functions
function setupSearchableMultiselect(selectBox, optionsContainer, placeholderText) {
    const searchInput = optionsContainer.querySelector(".multiselect-search-input");
    const optionsList = optionsContainer.querySelector(".options-list");
    
    selectBox.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = optionsContainer.classList.contains("show");
        
        document.querySelectorAll(".multiselect-options").forEach(opt => opt.classList.remove("show"));
        document.querySelectorAll(".multiselect-select").forEach(sel => sel.classList.remove("active"));

        if (!isOpen) {
            optionsContainer.classList.add("show");
            selectBox.classList.add("active");
            if (searchInput) {
                searchInput.value = "";
                filterOptions("", optionsList, placeholderText);
                setTimeout(() => searchInput.focus(), 50);
            }
        }
    });

    optionsList.addEventListener("change", () => {
        updateSelectDisplay(selectBox, optionsList, placeholderText);
    });

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            filterOptions(query, optionsList, placeholderText);
        });
        searchInput.addEventListener("click", (e) => e.stopPropagation());
    }
}

function filterOptions(query, optionsList, placeholderText) {
    const labels = optionsList.querySelectorAll("label:not(.custom-option-adder)");
    const queryLower = query.toLowerCase();
    let exactMatchFound = false;

    labels.forEach(label => {
        const text = label.textContent.trim().toLowerCase();
        if (text.includes(queryLower)) {
            label.style.display = "flex";
            if (text === queryLower) exactMatchFound = true;
        } else {
            label.style.display = "none";
        }
    });

    const existingAdder = optionsList.querySelector(".custom-option-adder");
    if (existingAdder) existingAdder.remove();

    if (query && !exactMatchFound) {
        const adder = document.createElement("label");
        adder.className = "custom-option-adder";
        adder.innerHTML = `<i class="fa-solid fa-plus" style="color: var(--primary)"></i> Add "${query}"`;
        
        adder.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const newLabel = document.createElement("label");
            newLabel.innerHTML = `<input type="checkbox" value="${query}" checked> ${query}`;
            newLabel.querySelector('input').addEventListener('change', () => {
                const selectBox = optionsList.closest(".custom-multiselect").querySelector(".multiselect-select");
                updateSelectDisplay(selectBox, optionsList, placeholderText);
            });
            optionsList.appendChild(newLabel);

            const selectBox = optionsList.closest(".custom-multiselect").querySelector(".multiselect-select");
            updateSelectDisplay(selectBox, optionsList, placeholderText);

            const searchInput = optionsList.closest(".multiselect-options").querySelector(".multiselect-search-input");
            if (searchInput) {
                searchInput.value = "";
                filterOptions("", optionsList, placeholderText);
            }
        });
        optionsList.insertBefore(adder, optionsList.firstChild);
    }
}

// Update tag display
function updateSelectDisplay(selectBox, optionsList, placeholderText) {
    const checkedCheckboxes = optionsList.querySelectorAll('input[type="checkbox"]:checked');
    const selectSpan = selectBox.querySelector("span");

    if (checkedCheckboxes.length === 0) {
        selectSpan.className = "placeholder";
        selectSpan.textContent = placeholderText;
    } else {
        selectSpan.className = "selected-tags";
        selectSpan.innerHTML = "";
        checkedCheckboxes.forEach(checkbox => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = checkbox.value;
            selectSpan.appendChild(tag);
        });
    }
}

// Initialize multiselect events
if (skillsSelectBox && skillsOptionsContainer) {
    setupSearchableMultiselect(skillsSelectBox, skillsOptionsContainer, "Select Skills");
}

document.addEventListener("click", () => {
    if (skillsOptionsContainer) skillsOptionsContainer.classList.remove("show");
    if (skillsSelectBox) skillsSelectBox.classList.remove("active");
});

if (skillsOptionsContainer) {
    skillsOptionsContainer.addEventListener("click", (e) => e.stopPropagation());
}

// Resume upload elements
const resumeForm = document.getElementById("resumeForm");
const fileDropArea = document.getElementById("fileDropArea");
const resumeFileInput = document.getElementById("resumeFileInput");
const uploadResumeBtn = document.getElementById("uploadResumeBtn");
const resumeStatusDiv = document.getElementById("resumeStatus");

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
// Load User Data & Populate Forms
// ==========================================
async function loadUserProfile() {
    try {
        const res = await fetch(`${PROFILE_API_BASE}/users/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to load profile.");
        }

        const profile = data.user;

        // Set Topbar info
        document.getElementById("profileName").textContent = (profile.name || "").split(" ")[0];
        // Topbar avatar (letter or photo)
        const topbarAvatar = document.getElementById("profileAvatar");
        setAvatarDisplay(topbarAvatar, profile.avatar, profile.name);

        // Sidebar avatar preview
        const sidebarPreview = document.getElementById("avatarPreview");
        if (sidebarPreview) {
            setAvatarDisplay(sidebarPreview, profile.avatar, profile.name);
        }

        const deleteAvatarBtn = document.getElementById("deleteAvatarBtn");
        if (deleteAvatarBtn) {
            deleteAvatarBtn.style.display = profile.avatar ? "block" : "none";
        }

        // Populate Form Fields
        fullNameInput.value = profile.name || "";
        emailInput.value = profile.email || "";

        // Parse country code from phone number
        const phoneStr = (profile.phone || "").trim();
        let matchedCode = false;
        const codes = ["+91", "+1", "+44", "+49", "+33", "+61", "+65", "+31", "+353"];
        
        const codeMatch = phoneStr.match(/^\+(\d{1,4})/);
        if (codeMatch) {
            const parsedCode = codeMatch[0];
            if (codes.includes(parsedCode)) {
                if (countryCodeSelect) countryCodeSelect.value = parsedCode;
                if (customCountryCodeInput) {
                    customCountryCodeInput.style.display = "none";
                    customCountryCodeInput.value = "";
                }
                phoneInput.value = phoneStr.substring(parsedCode.length).trim();
                matchedCode = true;
            } else {
                if (countryCodeSelect) countryCodeSelect.value = "custom";
                if (customCountryCodeInput) {
                    customCountryCodeInput.style.display = "inline-block";
                    customCountryCodeInput.value = parsedCode;
                }
                phoneInput.value = phoneStr.substring(parsedCode.length).trim();
                matchedCode = true;
            }
        }
        
        if (!matchedCode) {
            if (countryCodeSelect) countryCodeSelect.value = "+91"; // default to India
            if (customCountryCodeInput) {
                customCountryCodeInput.style.display = "none";
                customCountryCodeInput.value = "";
            }
            phoneInput.value = phoneStr;
        }

        educationInput.value = profile.education || "";
        experienceInput.value = profile.experience || "";
        const loadedSkills = profile.skills || [];
        if (skillsOptionsContainer) {
            const optionsList = skillsOptionsContainer.querySelector(".options-list");
            loadedSkills.forEach(skill => {
                let exists = false;
                optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.value === skill) exists = true;
                });
                if (!exists) {
                    const newLabel = document.createElement("label");
                    newLabel.innerHTML = `<input type="checkbox" value="${skill}"> ${skill}`;
                    optionsList.appendChild(newLabel);
                }
            });
            optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = loadedSkills.includes(cb.value);
            });
            updateSelectDisplay(skillsSelectBox, optionsList, "Select Skills");
        }
        portfolioInput.value = profile.portfolio || "";
        linkedinInput.value = profile.linkedin || "";
        githubInput.value = profile.github || "";
        if (currentTitleInput) currentTitleInput.value = profile.currentTitle || "";
        if (currentCompanyInput) currentCompanyInput.value = profile.currentCompany || "";
        if (noticePeriodInput) noticePeriodInput.value = profile.noticePeriod || "Immediate";
        if (expectedSalaryInput) expectedSalaryInput.value = profile.expectedSalary || "";
        if (requireSponsorshipInput) requireSponsorshipInput.value = profile.requireSponsorship || "No";

        // Render Resume status
        renderResumeStatus(profile.resume);

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================
// Render Resume Section
// ==========================================
function renderResumeStatus(resumeFilename) {
    if (resumeFilename) {
        const fileUrl = `${PROFILE_SERVER_BASE}/uploads/resumes/${resumeFilename}`;
        resumeStatusDiv.innerHTML = `
            <div class="has-resume">
                <p><i class="fa-solid fa-circle-check" style="color: var(--success)"></i> Resume uploaded!</p>
                <div class="resume-actions-row">
                    <a href="${fileUrl}" target="_blank" class="resume-action-link">
                        <i class="fa-solid fa-eye"></i> View Resume
                    </a>
                    <button class="resume-action-link delete" id="deleteResumeBtn">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;

        // Attach delete listener
        document.getElementById("deleteResumeBtn").addEventListener("click", deleteUserResume);
    } else {
        resumeStatusDiv.innerHTML = `
            <p class="no-resume"><i class="fa-solid fa-circle-info"></i> No resume uploaded yet.</p>
        `;
    }
}

// ==========================================
// Save Profile Details
// ==========================================
if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        let countryCodeVal = countryCodeSelect ? countryCodeSelect.value : "+91";
        if (countryCodeVal === "custom") {
            const customCode = (customCountryCodeInput ? customCountryCodeInput.value.trim() : "").trim();
            if (!/^\+\d{1,4}$/.test(customCode)) {
                showToast("Please enter a valid custom country code (e.g. +91 or +353). It must start with '+' followed by 1 to 4 digits.", "error");
                if (customCountryCodeInput) customCountryCodeInput.focus();
                return;
            }
            countryCodeVal = customCode;
        }

        const profileData = {
            name: fullNameInput.value.trim(),
            phone: (countryCodeVal + " " + phoneInput.value.trim()).trim(),
            education: educationInput.value.trim(),
            experience: experienceInput.value.trim(),
            skills: (() => {
                const selectedSkills = [];
                if (skillsOptionsContainer) {
                    skillsOptionsContainer.querySelectorAll('.options-list input[type="checkbox"]:checked').forEach(cb => {
                        selectedSkills.push(cb.value);
                    });
                }
                return selectedSkills;
            })(),
            portfolio: portfolioInput.value.trim(),
            linkedin: linkedinInput.value.trim(),
            github: githubInput.value.trim(),
            currentTitle: currentTitleInput.value.trim(),
            currentCompany: currentCompanyInput.value.trim(),
            noticePeriod: noticePeriodInput.value,
            expectedSalary: expectedSalaryInput.value.trim(),
            requireSponsorship: requireSponsorshipInput.value
        };

        try {
            const res = await fetch(`${PROFILE_API_BASE}/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to update profile.");
            }

            // Update user in localStorage
            const updatedUser = { ...user, name: data.user.name };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Update topbar display name
            document.getElementById("profileName").textContent = (data.user.name || "").split(" ")[0];

            showToast("Profile details updated successfully!", "success");

        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// ==========================================
// Drag & Drop / File Select Listeners
// ==========================================
function initResumeUpload() {
    if (fileDropArea && resumeFileInput) {
        fileDropArea.addEventListener("click", (e) => {
            e.stopPropagation();
            // Only trigger if click came from the drop area itself, not the input
            if (e.target === resumeFileInput) return;
            resumeFileInput.click();
        });

        // Stop input click from bubbling back to the drop area
        resumeFileInput.addEventListener("click", (e) => e.stopPropagation());

        resumeFileInput.addEventListener("change", () => {
            handleFileSelection(resumeFileInput.files[0]);
        });

        // Drag events
        ["dragenter", "dragover"].forEach(eventName => {
            fileDropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                fileDropArea.classList.add("highlight");
            }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            fileDropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                fileDropArea.classList.remove("highlight");
            }, false);
        });

        fileDropArea.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            handleFileSelection(file);
        });
    }
}

function handleFileSelection(file) {
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast("Resume size must not exceed 5MB", "error");
        uploadResumeBtn.disabled = true;
        fileDropArea.querySelector(".file-info").textContent = "File too large (Max 5MB)";
        fileDropArea.querySelector(".file-info").style.color = "var(--danger)";
        return;
    }

    // Set preview text
    fileDropArea.querySelector(".file-info").textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    fileDropArea.querySelector(".file-info").style.color = "var(--primary)";
    uploadResumeBtn.disabled = false;
}

// ==========================================
// Resume Upload / Delete Callouts
// ==========================================
if (resumeForm) {
    resumeForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const file = resumeFileInput.files[0] || (fileDropArea.dataset.file ? JSON.parse(fileDropArea.dataset.file) : null);
        if (!file) {
            showToast("Please select a file to upload first.", "warning");
            return;
        }

        const formData = new FormData();
        formData.append("resume", file);

        try {
            uploadResumeBtn.disabled = true;
            uploadResumeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

            const res = await fetch(`${PROFILE_API_BASE}/resumes/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to upload resume.");
            }

            showToast("Resume uploaded successfully!", "success");
            renderResumeStatus(data.file);

            // Auto-fill profile fields with parsed resume metadata
            if (data.parsedDetails) {
                showToast("Resume parsed! Auto-filling profile details...", "success");
                const details = data.parsedDetails;
                
                if (details.phone) phoneInput.value = details.phone;
                if (details.education) educationInput.value = details.education;
                if (details.experience) experienceInput.value = details.experience;
                if (details.currentTitle && currentTitleInput) currentTitleInput.value = details.currentTitle;

                if (details.skills && details.skills.length > 0 && skillsOptionsContainer) {
                    const optionsList = skillsOptionsContainer.querySelector(".options-list");
                    details.skills.forEach(skill => {
                        let exists = false;
                        optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                            if (cb.value.toLowerCase() === skill.toLowerCase()) {
                                cb.checked = true;
                                exists = true;
                            }
                        });
                        
                        if (!exists) {
                            const newLabel = document.createElement("label");
                            newLabel.innerHTML = `<input type="checkbox" value="${skill}" checked> ${skill}`;
                            newLabel.querySelector('input').addEventListener('change', () => {
                                updateSelectDisplay(skillsSelectBox, optionsList, "Select Skills");
                            });
                            optionsList.appendChild(newLabel);
                        }
                    });
                    updateSelectDisplay(skillsSelectBox, optionsList, "Select Skills");
                }
            }

            // Reset upload widget
            resumeForm.reset();
            fileDropArea.querySelector(".file-info").textContent = "Supports PDF, DOC, DOCX (Max 5MB)";
            fileDropArea.querySelector(".file-info").style.color = "var(--text-light)";
            uploadResumeBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload New Resume`;
            uploadResumeBtn.disabled = true;

        } catch (err) {
            showToast(err.message, "error");
            uploadResumeBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload New Resume`;
            uploadResumeBtn.disabled = false;
        }
    });
}

async function deleteUserResume() {
    if (!confirm("Are you sure you want to delete your resume?")) return;

    try {
        const res = await fetch(`${PROFILE_API_BASE}/resumes`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to delete resume.");
        }

        showToast("Resume deleted successfully!", "success");
        renderResumeStatus(null);

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================
// Avatar Upload UI Logic
// ==========================================
function initAvatarUpload() {
    const wrapper    = document.getElementById("avatarUploadWrapper");
    const overlay    = document.getElementById("avatarOverlay");
    const fileInput  = document.getElementById("avatarFileInput");
    const preview    = document.getElementById("avatarPreview");
    const uploadBtn  = document.getElementById("uploadAvatarBtn");
    const deleteBtn  = document.getElementById("deleteAvatarBtn");

    if (!wrapper || !fileInput || !uploadBtn) return;

    let selectedFile = null;

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to remove your profile photo?")) return;
            
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Removing...`;
            
            try {
                const res = await fetch(`${PROFILE_API_BASE}/users/avatar`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to remove photo.");
                
                const storedUser = JSON.parse(localStorage.getItem("user")) || {};
                storedUser.avatar = "";
                localStorage.setItem("user", JSON.stringify(storedUser));
                
                const topbarAvatar = document.getElementById("profileAvatar");
                setAvatarDisplay(topbarAvatar, "", storedUser.name);
                setAvatarDisplay(preview, "", storedUser.name);
                
                deleteBtn.style.display = "none";
                showToast("Profile photo removed! 🗑️", "success");
            } catch (err) {
                showToast(err.message, "error");
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Remove Photo`;
            }
        });
    }

    // Show/hide camera overlay on hover
    wrapper.addEventListener("mouseenter", () => overlay.style.opacity = "1");
    wrapper.addEventListener("mouseleave", () => overlay.style.opacity = "0");

    // Open file picker on click (stop propagation to prevent loop)
    wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.target === fileInput) return;
        fileInput.click();
    });

    // Stop file input click from bubbling back to wrapper
    fileInput.addEventListener("click", (e) => e.stopPropagation());

    // Preview selected image immediately
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast("Image must be under 2MB.", "error");
            return;
        }

        selectedFile = file;
        uploadBtn.disabled = false;

        // Show local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview"
                style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            preview.style.fontSize = "0";
            preview.style.padding  = "0";
        };
        reader.readAsDataURL(file);
    });

    // Upload on button click
    uploadBtn.addEventListener("click", async () => {
        if (!selectedFile) return;

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

        try {
            const newFilename = await uploadAvatar(selectedFile, token);

            // Update localStorage user object
            const storedUser = JSON.parse(localStorage.getItem("user")) || {};
            storedUser.avatar = newFilename;
            localStorage.setItem("user", JSON.stringify(storedUser));

            // Refresh topbar avatar
            const topbarAvatar = document.getElementById("profileAvatar");
            setAvatarDisplay(topbarAvatar, newFilename, storedUser.name);

            // Show delete button
            const deleteAvatarBtn = document.getElementById("deleteAvatarBtn");
            if (deleteAvatarBtn) deleteAvatarBtn.style.display = "block";

            showToast("Profile photo updated! 🎉", "success");
            uploadBtn.innerHTML = `<i class="fa-solid fa-check"></i> Uploaded!`;
            selectedFile = null;

            setTimeout(() => {
                uploadBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload Photo`;
            }, 2500);

        } catch (err) {
            showToast(err.message, "error");
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload Photo`;
        }
    });
}

// Initialise Page
document.addEventListener("DOMContentLoaded", () => {
    loadUserProfile();
    initAvatarUpload();
    initResumeUpload();
});
