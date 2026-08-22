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

// DOM Elements
const preferencesForm = document.getElementById("preferencesForm");
const prefExperienceInput = document.getElementById("prefExperience");
const prefSalaryInput = document.getElementById("prefSalary");
const prefWorkModeInput = document.getElementById("prefWorkMode");
const prefEmploymentTypeInput = document.getElementById("prefEmploymentType");
const includeRemoteJobsInput = document.getElementById("includeRemoteJobs");
const remotePrefIndiaInput = document.getElementById("remotePrefIndia");
const remotePrefOutsideInput = document.getElementById("remotePrefOutside");
const remoteLocationsWrapper = document.getElementById("remoteLocationsWrapper");

// Custom Multiselect Elements
const rolesSelectBox = document.getElementById("rolesSelectBox");
const rolesOptionsContainer = document.getElementById("rolesOptionsContainer");
const locationsSelectBox = document.getElementById("locationsSelectBox");
const locationsOptionsContainer = document.getElementById("locationsOptionsContainer");

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
// Custom Multiselect Component Setup
// ==========================================
function setupSearchableMultiselect(selectBox, optionsContainer, placeholderText) {
    const searchInput = optionsContainer.querySelector(".multiselect-search-input");
    const optionsList = optionsContainer.querySelector(".options-list");
    
    // Toggle dropdown
    selectBox.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = optionsContainer.classList.contains("show");
        
        // Close all other multiselects first
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

    // Checkbox changes
    optionsList.addEventListener("change", () => {
        updateSelectDisplay(selectBox, optionsList, placeholderText);
        if (typeof updatePreferenceStrength === "function") updatePreferenceStrength();
    });

    // Search input changes
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            filterOptions(query, optionsList, placeholderText);
        });

        // Prevent dropdown close when clicking search input
        searchInput.addEventListener("click", (e) => e.stopPropagation());
    }
}

function filterOptions(query, optionsList, placeholderText) {
    const labels = optionsList.querySelectorAll("label:not(.custom-option-adder)");
    const queryLower = query.toLowerCase();
    let exactMatchFound = false;

    labels.forEach(label => {
        const val = label.querySelector("input").value;
        const text = label.textContent.trim().toLowerCase();
        
        if (text.includes(queryLower)) {
            label.style.display = "flex";
            if (text === queryLower) {
                exactMatchFound = true;
            }
        } else {
            label.style.display = "none";
        }
    });

    // Remove existing custom adder if any
    const existingAdder = optionsList.querySelector(".custom-option-adder");
    if (existingAdder) {
        existingAdder.remove();
    }

    // Add a custom option button if the user typed something new and no exact match is found
    if (query && !exactMatchFound) {
        const adder = document.createElement("label");
        adder.className = "custom-option-adder";
        adder.innerHTML = `<i class="fa-solid fa-plus" style="color: var(--primary)"></i> Add "${query}"`;
        
        adder.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Add new option checkbox
            const newLabel = document.createElement("label");
            newLabel.innerHTML = `<input type="checkbox" value="${query}" checked> ${query}`;
            newLabel.querySelector('input').addEventListener('change', () => {
                const selectBox = optionsList.closest(".custom-multiselect").querySelector(".multiselect-select");
                updateSelectDisplay(selectBox, optionsList, placeholderText);
            });
            optionsList.appendChild(newLabel);

            // Update display
            const selectBox = optionsList.closest(".custom-multiselect").querySelector(".multiselect-select");
            updateSelectDisplay(selectBox, optionsList, placeholderText);

            // Clear search
            const searchInput = optionsList.closest(".multiselect-options").querySelector(".multiselect-search-input");
            if (searchInput) {
                searchInput.value = "";
                filterOptions("", optionsList, placeholderText);
            }
        });

        optionsList.insertBefore(adder, optionsList.firstChild);
    }
}

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
if (rolesSelectBox && rolesOptionsContainer) {
    setupSearchableMultiselect(rolesSelectBox, rolesOptionsContainer, "Select Job Roles");
}
if (locationsSelectBox && locationsOptionsContainer) {
    setupSearchableMultiselect(locationsSelectBox, locationsOptionsContainer, "Select Locations");
}

// Close dropdowns when clicking outside
document.addEventListener("click", () => {
    if (rolesOptionsContainer) rolesOptionsContainer.classList.remove("show");
    if (rolesSelectBox) rolesSelectBox.classList.remove("active");
    if (locationsOptionsContainer) locationsOptionsContainer.classList.remove("show");
    if (locationsSelectBox) locationsSelectBox.classList.remove("active");
});

// Prevent dropdown close when clicking options panel
if (rolesOptionsContainer) {
    rolesOptionsContainer.addEventListener("click", (e) => e.stopPropagation());
}
if (locationsOptionsContainer) {
    locationsOptionsContainer.addEventListener("click", (e) => e.stopPropagation());
}

// ==========================================
// Load Preferences
// ==========================================
async function loadPreferences() {
    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to load preferences.");
        }

        const profile = data.user;

        // Set Topbar info
        document.getElementById("profileName").textContent = (profile.name || "").split(" ")[0];
        const avatarEl = document.getElementById("profileAvatar");
        setAvatarDisplay(avatarEl, profile.avatar, profile.name);

        // Populate Preferences
        prefExperienceInput.value = profile.prefExperience || "Fresher (0 years)";
        prefSalaryInput.value = profile.prefSalary || "3-6 LPA";
        prefWorkModeInput.value = profile.prefWorkMode || "Any";
        prefEmploymentTypeInput.value = profile.prefEmploymentType || "Any";
        if (includeRemoteJobsInput) {
            includeRemoteJobsInput.checked = profile.includeRemoteJobs === true;
            if (remoteLocationsWrapper) {
                remoteLocationsWrapper.style.display = includeRemoteJobsInput.checked ? "flex" : "none";
            }
        }
        if (remotePrefIndiaInput) {
            remotePrefIndiaInput.checked = profile.remotePrefIndia === true;
        }
        if (remotePrefOutsideInput) {
            remotePrefOutsideInput.checked = profile.remotePrefOutside === true;
        }

        // Check Multiselect values
        const loadedRoles = profile.prefRoles || [];
        const loadedLocations = profile.prefLocations || [];

        if (rolesOptionsContainer) {
            const optionsList = rolesOptionsContainer.querySelector(".options-list");
            
            // First check if any loaded values are NOT in the pre-populated list, and add them dynamically
            loadedRoles.forEach(role => {
                let exists = false;
                optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.value === role) exists = true;
                });
                if (!exists) {
                    const newLabel = document.createElement("label");
                    newLabel.innerHTML = `<input type="checkbox" value="${role}"> ${role}`;
                    optionsList.appendChild(newLabel);
                }
            });

            // Set checks
            optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = loadedRoles.includes(cb.value);
            });
            
            updateSelectDisplay(rolesSelectBox, optionsList, "Select Job Roles");
        }

        if (locationsOptionsContainer) {
            const optionsList = locationsOptionsContainer.querySelector(".options-list");
            
            // First check if any loaded values are NOT in the pre-populated list, and add them dynamically
            loadedLocations.forEach(loc => {
                let exists = false;
                optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.value === loc) exists = true;
                });
                if (!exists) {
                    const newLabel = document.createElement("label");
                    newLabel.innerHTML = `<input type="checkbox" value="${loc}"> ${loc}`;
                    optionsList.appendChild(newLabel);
                }
            });

            // Set checks
            optionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = loadedLocations.includes(cb.value);
            });
            
            updateSelectDisplay(locationsSelectBox, optionsList, "Select Locations");
        }

        if (typeof updatePreferenceStrength === "function") {
            updatePreferenceStrength();
        }

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================
// Save Preferences
// ==========================================
if (preferencesForm) {
    preferencesForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Collect multiselect values
        const selectedRoles = [];
        if (rolesOptionsContainer) {
            rolesOptionsContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                selectedRoles.push(cb.value);
            });
        }

        const selectedLocations = [];
        if (locationsOptionsContainer) {
            locationsOptionsContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                selectedLocations.push(cb.value);
            });
        }

        if (includeRemoteJobsInput && includeRemoteJobsInput.checked) {
            const indiaChecked = remotePrefIndiaInput ? remotePrefIndiaInput.checked : true;
            const outsideChecked = remotePrefOutsideInput ? remotePrefOutsideInput.checked : true;
            if (!indiaChecked && !outsideChecked) {
                showToast("Please select at least one Remote Job Region (within India or outside India).", "error");
                return;
            }
        }

        const preferencesData = {
            prefRoles: selectedRoles,
            prefLocations: selectedLocations,
            prefExperience: prefExperienceInput.value.trim(),
            prefSalary: prefSalaryInput.value.trim(),
            prefWorkMode: prefWorkModeInput.value.trim(),
            prefEmploymentType: prefEmploymentTypeInput.value.trim(),
            includeRemoteJobs: includeRemoteJobsInput ? includeRemoteJobsInput.checked : true,
            remotePrefIndia: remotePrefIndiaInput ? remotePrefIndiaInput.checked : true,
            remotePrefOutside: remotePrefOutsideInput ? remotePrefOutsideInput.checked : true
        };

        try {
            const res = await fetch(`${API_BASE}/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(preferencesData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to update preferences.");
            }

            showToast("Preferences saved successfully!", "success");

        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Initialise Page
document.addEventListener("DOMContentLoaded", () => {
    loadPreferences();
    
    // Bind Real-Time Recalculations
    if (includeRemoteJobsInput) {
        includeRemoteJobsInput.addEventListener("change", () => {
            if (remoteLocationsWrapper) {
                remoteLocationsWrapper.style.display = includeRemoteJobsInput.checked ? "flex" : "none";
            }
            updatePreferenceStrength();
        });
    }
    if (remotePrefIndiaInput) {
        remotePrefIndiaInput.addEventListener("change", () => {
            if (remotePrefOutsideInput && !remotePrefIndiaInput.checked && !remotePrefOutsideInput.checked) {
                remotePrefIndiaInput.checked = true;
                showToast("At least one remote region must be selected when remote jobs are enabled.", "error");
            }
            updatePreferenceStrength();
        });
    }
    if (remotePrefOutsideInput) {
        remotePrefOutsideInput.addEventListener("change", () => {
            if (remotePrefIndiaInput && !remotePrefIndiaInput.checked && !remotePrefOutsideInput.checked) {
                remotePrefOutsideInput.checked = true;
                showToast("At least one remote region must be selected when remote jobs are enabled.", "error");
            }
            updatePreferenceStrength();
        });
    }
    if (prefExperienceInput) prefExperienceInput.addEventListener("change", updatePreferenceStrength);
    if (prefSalaryInput) prefSalaryInput.addEventListener("change", updatePreferenceStrength);
    if (prefWorkModeInput) prefWorkModeInput.addEventListener("change", updatePreferenceStrength);
    if (prefEmploymentTypeInput) prefEmploymentTypeInput.addEventListener("change", updatePreferenceStrength);
});

// ==========================================
// AI Search Diagnostics & Scoring Logic
// ==========================================
function getCheckedRolesCount() {
    if (!rolesOptionsContainer) return 0;
    return rolesOptionsContainer.querySelectorAll('input[type="checkbox"]:checked').length;
}

function getCheckedLocationsCount() {
    if (!locationsOptionsContainer) return 0;
    return locationsOptionsContainer.querySelectorAll('input[type="checkbox"]:checked').length;
}

function updatePreferenceStrength() {
    const strengthRing = document.getElementById("strengthRing");
    const strengthValue = document.getElementById("strengthValue");
    const strengthLabel = document.getElementById("strengthLabel");
    const recommendationsList = document.getElementById("recommendationsList");
    const statusScope = document.getElementById("statusScope");

    if (!strengthRing || !strengthValue) return;

    let score = 0;
    const recommendations = [];

    // 1. Roles Selection (30 points)
    const rolesCount = getCheckedRolesCount();
    if (rolesCount > 0) {
        score += 30;
        recommendations.push({
            text: `Preferred Roles configured (${rolesCount} selected)`,
            completed: true
        });
    } else {
        recommendations.push({
            text: "Add at least one Preferred Job Role to guide AI matching.",
            completed: false
        });
    }

    // 2. Locations Selection (20 points)
    const locationsCount = getCheckedLocationsCount();
    if (locationsCount > 0) {
        score += 20;
        recommendations.push({
            text: `Preferred Locations configured (${locationsCount} selected)`,
            completed: true
        });
    } else {
        recommendations.push({
            text: "Add Preferred Locations for onsite/hybrid listings.",
            completed: false
        });
    }

    // 3. Include Remote Jobs (20 points)
    const isRemoteEnabled = includeRemoteJobsInput ? includeRemoteJobsInput.checked : true;
    if (isRemoteEnabled) {
        score += 20;
        const indiaSelected = remotePrefIndiaInput ? remotePrefIndiaInput.checked : true;
        const outsideSelected = remotePrefOutsideInput ? remotePrefOutsideInput.checked : true;
        
        let scopeText = "Remote Only";
        if (locationsCount > 0) {
            scopeText = "Global & Local";
        }
        
        if (indiaSelected && !outsideSelected) {
            scopeText = locationsCount > 0 ? "India Remote & Local" : "India Remote Only";
        } else if (outsideSelected && !indiaSelected) {
            scopeText = locationsCount > 0 ? "Global Remote & Local" : "Global Remote Only";
        } else if (!indiaSelected && !outsideSelected) {
            scopeText = locationsCount > 0 ? "Local Onsite/Hybrid" : "Onsite Only";
        }

        recommendations.push({
            text: "Remote job matching is enabled.",
            completed: true
        });
        if (statusScope) {
            statusScope.textContent = scopeText;
        }
    } else {
        recommendations.push({
            text: "Enable remote jobs to significantly expand search coverage.",
            completed: false
        });
        if (statusScope) {
            statusScope.textContent = locationsCount > 0 ? "Local Onsite/Hybrid" : "Onsite Only";
        }
    }

    // 4. Experience Level (10 points)
    const expValue = prefExperienceInput ? prefExperienceInput.value : "";
    if (expValue) {
        score += 10;
        recommendations.push({
            text: `Experience level configured (${expValue})`,
            completed: true
        });
    } else {
        recommendations.push({
            text: "Specify experience details to narrow matches.",
            completed: false
        });
    }

    // 5. Expected Salary (10 points)
    const salaryValue = prefSalaryInput ? prefSalaryInput.value : "";
    if (salaryValue) {
        score += 10;
        recommendations.push({
            text: `Desired Salary level specified (${salaryValue})`,
            completed: true
        });
    } else {
        recommendations.push({
            text: "Specify expected salary brackets.",
            completed: false
        });
    }

    // 6. Work Mode & Employment Type (10 points)
    const workModeVal = prefWorkModeInput ? prefWorkModeInput.value : "";
    const empTypeVal = prefEmploymentTypeInput ? prefEmploymentTypeInput.value : "";
    
    if (workModeVal && workModeVal !== "Any" && empTypeVal && empTypeVal !== "Any") {
        score += 10;
        recommendations.push({
            text: "Custom work mode & employment details applied.",
            completed: true
        });
    } else {
        score += 5; // Partial
        recommendations.push({
            text: "Fine-tune work mode and employment settings.",
            completed: false
        });
    }

    // Clamp score
    score = Math.min(100, Math.max(0, score));

    // Animate progress ring
    const circumference = 345.57; // 2 * pi * 55
    const offset = circumference - (score / 100) * circumference;
    strengthRing.style.strokeDashoffset = offset;

    // Change circle color based on strength
    if (score < 40) {
        strengthRing.style.stroke = "#EF4444"; // Red
        if (strengthLabel) strengthLabel.textContent = "Weak setup - needs attention";
    } else if (score < 75) {
        strengthRing.style.stroke = "#F59E0B"; // Orange
        if (strengthLabel) strengthLabel.textContent = "Good setup - can be optimized further";
    } else {
        strengthRing.style.stroke = "#10B981"; // Green
        if (strengthLabel) strengthLabel.textContent = "Excellent setup - ready for matching!";
    }

    // Update value text
    strengthValue.textContent = `${score}%`;

    // Render recommendations checklist
    if (recommendationsList) {
        recommendationsList.innerHTML = "";
        recommendations.forEach(rec => {
            const item = document.createElement("div");
            item.className = `rec-item ${rec.completed ? 'completed' : 'pending'}`;
            
            const iconClass = rec.completed ? "fa-circle-check" : "fa-circle-question";
            item.innerHTML = `
                <i class="fa-solid ${iconClass}"></i>
                <span>${rec.text}</span>
            `;
            recommendationsList.appendChild(item);
        });
    }
}
