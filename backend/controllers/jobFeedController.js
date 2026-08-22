const User = require("../models/User");
const JobApplication = require("../models/JobApplication");
const CachedJob = require("../models/CachedJob");
const SearchQuota = require("../models/SearchQuota");
const { createNotification } = require("./notificationController");

// Helper to execute fetch with timeout to prevent hung requests
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

// Helper to fetch JSearch jobs from RapidAPI (Graceful fallback if API key is not present)
async function fetchJSearchJobs(query) {
    const key = process.env.JSEARCH_API_KEY;
    if (!key) {
        console.warn("JSearch API skipped: JSEARCH_API_KEY is not defined in the environment.");
        return [];
    }

    try {
        const response = await fetchWithTimeout(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=2`, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": key.trim(),
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        }, 8000);

        if (!response.ok) {
            throw new Error(`JSearch API HTTP error: ${response.status}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (err) {
        console.error("Failed to fetch jobs from JSearch API:", err);
        return [];
    }
}

// Helper to validate job title and JD experience against user preferences
function isExperienceMatch(prefExperience, jobTitle, description = "") {
    const titleLower = (jobTitle || "").toLowerCase();
    const descLower = (description || "").toLowerCase();
    const prefExp = (prefExperience || "").toLowerCase();

    const seniorKeywords = ["senior", "sr.", "lead", "principal", "staff", "manager", "director", "vp", "head", "architect", "mgr"];
    const internKeywords = ["intern", "co-op", "internship"];

    // Trainee / Graduate exceptions (overrides senior keywords)
    const traineeException = ["trainee", "graduate", "junior", "jr.", "fresher", "intern", "associate"];
    const hasTraineeOverride = traineeException.some(kw => titleLower.includes(kw));

    let jobYearsMin = null;
    let jobYearsMax = null;

    // Detect patterns in title or description (e.g. "3-5 years", "3+ years")
    const expRegex = /(\d+)\s*-\s*(\d+)\s*(?:yr|year)s?/i;
    const expPlusRegex = /(\d+)\+?\s*(?:yr|year)s?/i;
    
    const rangeMatch = descLower.match(expRegex) || titleLower.match(expRegex);
    if (rangeMatch) {
        jobYearsMin = parseInt(rangeMatch[1]);
        jobYearsMax = parseInt(rangeMatch[2]);
    } else {
        const plusMatch = descLower.match(expPlusRegex) || titleLower.match(expPlusRegex);
        if (plusMatch) {
            const val = parseInt(plusMatch[1]);
            const isPlus = plusMatch[0].includes("+");
            jobYearsMin = val;
            if (!isPlus) {
                jobYearsMax = val;
            }
        }
    }

    if (prefExp.includes("fresher") || prefExp.includes("0 years") || prefExp.includes("1-2") || prefExp.includes("junior")) {
        if (jobYearsMin !== null && jobYearsMin >= 4) {
            return false; // Require 4+ years is senior
        }
        if (!hasTraineeOverride) {
            const hasSeniorKeyword = seniorKeywords.some(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, "i");
                return regex.test(titleLower);
            });
            if (hasSeniorKeyword) return false;
        }
    }

    if (prefExp.includes("senior") || prefExp.includes("5+") || prefExp.includes("lead")) {
        const hasInternKeyword = internKeywords.some(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, "i");
            return regex.test(titleLower);
        });
        if (hasInternKeyword) return false;

        if (jobYearsMax !== null && jobYearsMax <= 2) {
            return false; // Under 2 years is not senior
        }
    }

    return true;
}

// Helper to increment search quota counters and check if exceeded
async function checkAndIncrementQuota(source, limit) {
    const today = new Date().toISOString().split("T")[0];
    try {
        const record = await SearchQuota.findOneAndUpdate(
            { date: today, source: source },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
        );
        return record.count > limit;
    } catch (err) {
        console.error(`Quota check failed for ${source}:`, err);
        return false;
    }
}

// Helper to calculate match score dynamically based on user profile and job parameters
function calculateMatchScore(userSkills, targetRoles, resumeText, jobTitle, description, workMode, userPrefMode) {
    const titleText = (jobTitle || "").toLowerCase();
    const combinedText = `${jobTitle} ${description || ""}`.toLowerCase();
    const matchedSkills = [];
    const missingSkills = [];
    
    const requiredSkills = SKILLS_DICTIONARY.filter(skill => {
        return combinedText.includes(skill.toLowerCase());
    });

    const userSkillsLower = (userSkills || []).map(s => s.toLowerCase());
    requiredSkills.forEach(skill => {
        if (userSkillsLower.includes(skill.toLowerCase())) {
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    });

    let matchPercent = 0;

    // A. Title Match: +25%
    const matchesPrefRole = (targetRoles || []).some(role => titleText.includes(role.toLowerCase()));
    if (matchesPrefRole) {
        matchPercent += 25;
    }

    // B. Work Mode Match: +10%
    if ((userPrefMode || "Any").toLowerCase() === (workMode || "Onsite").toLowerCase() || (userPrefMode || "Any") === "Any") {
        matchPercent += 10;
    }

    // C. Skill Coverage: +65%
    if (requiredSkills.length > 0) {
        const skillRatio = matchedSkills.length / requiredSkills.length;
        matchPercent += Math.round(skillRatio * 65);
    } else if (userSkills && userSkills.length > 0) {
        let matchedCount = 0;
        userSkills.forEach(skill => {
            if (combinedText.includes(skill.toLowerCase())) {
                matchedCount++;
            }
        });
        const skillRatio = matchedCount / userSkills.length;
        matchPercent += Math.round(skillRatio * 65);
    }

    // Small bonus for resume text match if applicable
    if (resumeText && combinedText.includes(resumeText.slice(0, 15).toLowerCase())) {
        matchPercent += 4;
    }

    matchPercent = Math.max(10, Math.min(matchPercent, 99));
    return {
        matchPercent,
        matchedSkills,
        missingSkills
    };
}

const SKILLS_DICTIONARY = [
    "JavaScript", "HTML", "CSS", "React", "Node.js", "Express", "MongoDB", "SQL", 
    "Python", "Java", "C++", "TypeScript", "Git", "AWS", "Docker", "Kubernetes", 
    "Angular", "Vue", "PHP", "Ruby", "Swift", "Flutter", "React Native", 
    "Communication", "Teamwork", "Problem Solving", "Time Management", "Leadership", 
    "Adaptability", "Critical Thinking", "Creativity", "Work Ethic", "Emotional Intelligence", 
    "Conflict Resolution", "Interpersonal Skills", "Customer Service", "Collaboration",
    "Go", "Rust", "C#", "Next.js", "Nuxt.js", "PostgreSQL", "MySQL", "Redis", 
    "Figma", "UI/UX", "Product Management", "Scrum", "Agile", "DevOps", "CI/CD"
];

// Helper to resolve location string to country code for Adzuna API
function getCountryCode(locationName) {
    if (!locationName) return "unknown";
    const loc = locationName.toLowerCase();
    if (loc.includes("united kingdom") || loc.includes("london") || loc.includes(" uk") || loc.includes("gb")) return "gb";
    if (loc.includes("united states") || loc.includes("usa") || loc.includes("new york") || loc.includes("california") || loc.includes(", ca") || loc.includes(", ny")) return "us";
    if (loc.includes("germany") || loc.includes("berlin") || loc.includes("munich")) return "de";
    if (loc.includes("france") || loc.includes("paris")) return "fr";
    if (loc.includes("canada") || loc.includes("toronto") || loc.includes("vancouver")) return "ca";
    if (loc.includes("ireland") || loc.includes("dublin")) return "ie";
    if (loc.includes("australia") || loc.includes("sydney")) return "au";
    if (loc.includes("singapore")) return "sg";
    if (loc.includes("netherlands") || loc.includes("amsterdam")) return "nl";
    if (isIndianLocation(locationName)) return "in";
    return "unknown";
}

// Helper to identify if a location is in India
function isIndianLocation(locationText) {
    if (!locationText) return false;
    const text = locationText.toLowerCase();
    const indianCities = [
        "india", "bangalore", "bengaluru", "mumbai", "pune", "hyderabad", "chennai", 
        "delhi", "noida", "gurgaon", "gurugram", "coimbatore", "kochi", "kerala", 
        "karnataka", "tamil nadu", "maharashtra", "telangana", "kolkata", "ahmedabad",
        "jaipur", "ncr",
        // Tamil Nadu cities
        "trichy", "tiruchirappalli", "madurai", "salem", "tiruppur", "tirupur",
        "erode", "tirunelveli", "vellore", "thoothukudi", "tuticorin", "nagercoil",
        "thanjavur", "tanjore", "dindigul", "karur", "ooty", "udhagamandalam",
        "kanchipuram", "ambattur", "avadi", "cuddalore", "kumbakonam", "hosur",
        "krishnagiri", "namakkal", "ramanathapuram", "sivakasi", "virudhunagar",
        // Other Indian cities
        "mysore", "mysuru", "mangalore", "mangaluru", "hubli", "dharwad",
        "vizag", "visakhapatnam", "vijayawada", "guntur", "nagpur", "nashik",
        "surat", "vadodara", "indore", "bhopal", "lucknow", "kanpur", "patna",
        "bhubaneswar", "guwahati", "chandigarh", "dehradun", "pondicherry", "puducherry"
    ];
    return indianCities.some(city => text.includes(city));
}

// Helper to fetch direct company career board jobs (Greenhouse + Lever)
async function fetchDirectCareers(targetRoles, prefLocations) {
    const directJobs = [];
    const promises = [];

    // Top tech boards
    const greenhouseCompanies = ["stripe", "airbnb", "figma", "coinbase", "retool", "reddit", "datadog", "robinhood"];
    const leverCompanies = ["netflix", "vercel", "spotify", "shopify", "openai", "anthropic", "miro"];

    // 1. Fetch Greenhouse
    greenhouseCompanies.forEach(company => {
        promises.push(
            fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            }, 8000)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                if (data && Array.isArray(data.jobs)) {
                    data.jobs.forEach(job => {
                        const title = job.title || "";
                        const titleLower = title.toLowerCase();
                        
                        // Prefilter by roles to reduce processing overhead
                        const matchesRole = targetRoles.length === 0 || targetRoles.some(role => 
                            titleLower.includes(role)
                        );
                        if (!matchesRole) return;

                        let loc = (job.location && job.location.name) || "Location not specified";
                        if (loc.toLowerCase().trim() === "na" || loc.toLowerCase().trim() === "n/a") {
                            loc = "Location not specified";
                        }
                        const description = job.content || "";
                        const link = job.absolute_url || "";
                        
                        directJobs.push({
                            company: company.charAt(0).toUpperCase() + company.slice(1),
                            jobTitle: title,
                            location: loc,
                            link: link,
                            description: description.replace(/<[^>]*>/g, " ").trim(),
                            pubDate: new Date(),
                            source: "Company Careers (Greenhouse)"
                        });
                    });
                }
            })
            .catch(() => {})
        );
    });

    // 2. Fetch Lever
    leverCompanies.forEach(company => {
        promises.push(
            fetchWithTimeout(`https://api.lever.co/v0/postings/${company}`, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            }, 8000)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                if (Array.isArray(data)) {
                    data.forEach(job => {
                        const title = job.title || "";
                        const titleLower = title.toLowerCase();

                        // Prefilter by roles
                        const matchesRole = targetRoles.length === 0 || targetRoles.some(role => 
                            titleLower.includes(role)
                        );
                        if (!matchesRole) return;

                        let loc = job.categories && job.categories.location ? job.categories.location : "Location not specified";
                        if (loc.toLowerCase().trim() === "na" || loc.toLowerCase().trim() === "n/a") {
                            loc = "Location not specified";
                        }
                        const description = job.description || "";
                        const link = job.hostedUrl || "";
                        
                        directJobs.push({
                            company: company.charAt(0).toUpperCase() + company.slice(1),
                            jobTitle: title,
                            location: loc,
                            link: link,
                            description: description.replace(/<[^>]*>/g, " ").trim(),
                            pubDate: job.createdAt ? new Date(job.createdAt) : new Date(),
                            source: "Company Careers (Lever)"
                        });
                    });
                }
            })
            .catch(() => {})
        );
    });

    await Promise.allSettled(promises);
    return directJobs;
}

/**
 * Controller for fetching live remote/onsite/hybrid jobs from multiple sources
 * (WeWorkRemotely, RemoteOK, Arbeitnow, Remotive, Adzuna) concurrently with deduplication
 * and freshness filtering.
 */
const getLiveJobMatches = async (req, res) => {
    try {
        const rolesQuery = req.query.roles || "";
        const targetRoles = rolesQuery
            .split(",")
            .map(r => r.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 3); // Soft cap: top 3 roles

        const cappedRolesQuery = targetRoles.join(",");

        // Fetch query parameters for date freshness, work modes, and sorting
        const freshness = parseInt(req.query.freshness) || 7;
        const workModeParam = req.query.workMode || "all";
        const sortByParam = req.query.sortBy || "match";

        // Fetch user from DB to access skills, resume text, work mode & location preferences
        const user = await User.findById(req.user.id);
        const userSkills = user ? user.skills || [] : [];
        const resumeText = user ? user.resumeText || "" : "";
        const prefLocations = user ? user.prefLocations || [] : [];
        const includeRemote = user ? user.includeRemoteJobs === true : false;
        const remotePrefIndia = user ? user.remotePrefIndia === true : true;
        const remotePrefOutside = user ? user.remotePrefOutside === true : false;
        const userPrefExp = user ? user.prefExperience || "Fresher (0 years)" : "Fresher (0 years)";
        const userPrefMode = user ? user.prefWorkMode || "Any" : "Any";
        const blockedJobs = user ? user.blockedJobs || [] : [];

        // Quota limits check per source
        const jsearchExceeded = await checkAndIncrementQuota("JSearch", 50);
        const joobleExceeded = await checkAndIncrementQuota("Jooble", 20);
        const adzunaExceeded = await checkAndIncrementQuota("Adzuna", 250);
        const generalExceeded = await checkAndIncrementQuota("General", 500);

        let searchNotice = "";
        const skippedSources = [];
        if (jsearchExceeded) skippedSources.push("JSearch");
        if (joobleExceeded) skippedSources.push("Jooble");
        if (adzunaExceeded) skippedSources.push("Adzuna");
        if (generalExceeded) skippedSources.push("Public APIs (WWR/RemoteOK/Arbeitnow/Remotive)");

        if (skippedSources.length > 0) {
            searchNotice = `Showing cached results - daily limit reached for: ${skippedSources.join(", ")}`;
        }



        // 1. Database Deduplication: Fetch user's existing logged applications
        const existingApps = await JobApplication.find({ user: req.user.id }).select("company");
        const dbAppliedCompanies = new Set(existingApps.map(a => a.company.toLowerCase().trim()));

        const allRawJobs = [];
        const adzunaPromises = [];

        if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY && !adzunaExceeded) {
            const adzunaAppId = process.env.ADZUNA_APP_ID.trim();
            const adzunaAppKey = process.env.ADZUNA_APP_KEY.trim();

            if (adzunaAppId && adzunaAppKey) {
                const locationsToProcess = prefLocations.slice(0, 5);

                // Fan out: one call per role per location (Adzuna treats ?what= as exact phrase)
                const rolesToQuery = targetRoles.length > 0 ? targetRoles : ["software developer"];

                if (locationsToProcess.length > 0) {
                    locationsToProcess.forEach(loc => {
                        if (loc.toLowerCase() === "remote") return;
                        const country = getCountryCode(loc);
                        if (country === "unknown") {
                            console.log(`[DEBUG] Skipping Adzuna for unknown country: ${loc}`);
                            return;
                        }
                        rolesToQuery.forEach(role => {
                            adzunaPromises.push(
                                fetchWithTimeout(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${encodeURIComponent(role)}&where=${encodeURIComponent(loc)}&results_per_page=5&content-type=application/json`, {
                                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                                }, 8000)
                                .then(r => r.ok ? r.json() : Promise.reject(`Adzuna Error: ${country}/${loc}/${role}`))
                                .then(data => ({ country, data }))
                                .catch(err => { console.warn(`[Adzuna] ${err}`); return null; })
                            );
                        });
                    });
                } else {
                    // No locations → search India broadly per role
                    rolesToQuery.forEach(role => {
                        adzunaPromises.push(
                            fetchWithTimeout(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${encodeURIComponent(role)}&results_per_page=5&content-type=application/json`, {
                                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                            }, 8000)
                            .then(r => r.ok ? r.json() : Promise.reject(`Adzuna Error: in/${role}`))
                            .then(data => ({ country: "in", data }))
                            .catch(err => { console.warn(`[Adzuna] ${err}`); return null; })
                        );
                    });
                }
            }
        }

        const fetches = [
            // Source 1: WeWorkRemotely RSS
            includeRemote && !generalExceeded
                ? fetchWithTimeout("https://weworkremotely.com/remote-jobs.rss", {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                  }, 8000).then(r => r.ok ? r.text() : Promise.reject("WWR HTTP Error"))
                : Promise.resolve(""),

            // Source 2: RemoteOK API
            includeRemote && !generalExceeded
                ? fetchWithTimeout("https://remoteok.com/api", {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                  }, 8000).then(r => r.ok ? r.json() : Promise.reject("RemoteOK HTTP Error"))
                : Promise.resolve([]),

            // Source 3: Arbeitnow API
            !generalExceeded
                ? fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api", {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                }, 8000).then(r => r.ok ? r.json() : Promise.reject("Arbeitnow HTTP Error"))
                : Promise.resolve({ data: [] }),

            // Source 4: Remotive API
            includeRemote && !generalExceeded
                ? fetchWithTimeout("https://remotive.com/api/remote-jobs?limit=30", {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                  }, 8000).then(r => r.ok ? r.json() : Promise.reject("Remotive HTTP Error"))
                : Promise.resolve({ jobs: [] })
        ];

        // 2. Adzuna promises
        const adzunaStartIndex = fetches.length;
        if (adzunaPromises.length > 0) {
            fetches.push(...adzunaPromises);
        }
        const adzunaEndIndex = fetches.length;

        // 3. Jooble promises
        const joobleStartIndex = fetches.length;
        const jooblePromises = [];
        if (process.env.JOOBLE_API_KEY && !joobleExceeded) {
            const joobleKey = process.env.JOOBLE_API_KEY.trim();
            if (joobleKey) {
                const locationsToProcess = prefLocations.slice(0, 5); // Cap to first 5 locations
                if (locationsToProcess.length > 0) {
                    locationsToProcess.forEach(loc => {
                        jooblePromises.push(
                            fetchWithTimeout(`https://jooble.org/api/${joobleKey}`, {
                                method: "POST",
                                headers: {
                                     "Content-Type": "application/json",
                                     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                                },
                                body: JSON.stringify({
                                    keywords: cappedRolesQuery,
                                    location: loc,
                                    page: 1
                                })
                            }, 8000)
                            .then(r => r.ok ? r.json() : Promise.reject(`Jooble Error: ${loc}`))
                            .then(data => ({ source: "Jooble", data }))
                        );
                    });
                } else {
                    jooblePromises.push(
                        fetchWithTimeout(`https://jooble.org/api/${joobleKey}`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                            },
                            body: JSON.stringify({
                                keywords: cappedRolesQuery,
                                page: 1
                            })
                        }, 8000)
                        .then(r => r.ok ? r.json() : Promise.reject("Jooble Error"))
                        .then(data => ({ source: "Jooble", data }))
                    );
                }
            }
        }
        if (jooblePromises.length > 0) {
            fetches.push(...jooblePromises);
        }
        const joobleEndIndex = fetches.length;

        // 4. Direct Career Boards
        const directCareersIndex = fetches.length;
        fetches.push(fetchDirectCareers(targetRoles, prefLocations));

        // 5. JSearch API Aggregator
        const jsearchIndex = fetches.length;
        fetches.push(
            process.env.JSEARCH_API_KEY && !jsearchExceeded
                ? fetchJSearchJobs(cappedRolesQuery)
                : Promise.resolve([])
        );

        // Execute concurrent API fetches using Promise.allSettled
        const results = await Promise.allSettled(fetches);
        const wwrResult = results[0];
        const remoteOkResult = results[1];
        const arbeitnowResult = results[2];
        const remotiveResult = results[3];

        // 1. Process WeWorkRemotely RSS
        if (wwrResult.status === "fulfilled" && wwrResult.value) {
            try {
                const xmlText = wwrResult.value;
                const itemRegex = /<item>([\s\S]*?)<\/item>/g;
                let match;

                while ((match = itemRegex.exec(xmlText)) !== null) {
                    const content = match[1];
                    const title = (content.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
                    const link = (content.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
                    const desc = (content.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "";
                    const pubDateStr = (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "";

                    const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
                    const cleanLink = link.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
                    const cleanDesc = desc.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, " ").trim();

                    if (!cleanTitle) continue;

                    const titleParts = cleanTitle.split(":");
                    const company = titleParts[0] ? titleParts[0].trim() : "Unknown Company";
                    const jobTitle = titleParts[1] ? titleParts[1].trim() : cleanTitle;

                    allRawJobs.push({
                        company,
                        jobTitle,
                        location: "Remote",
                        link: cleanLink,
                        description: cleanDesc,
                        pubDate: pubDateStr ? new Date(pubDateStr) : new Date(),
                        source: "WeWorkRemotely"
                    });
                }
            } catch (err) {
                console.error("Error parsing WWR RSS:", err);
            }
        }

        // 2. Process RemoteOK API
        if (remoteOkResult.status === "fulfilled" && Array.isArray(remoteOkResult.value)) {
            try {
                remoteOkResult.value.forEach(item => {
                    if (item && item.position && item.company) {
                        const cleanDesc = (item.description || "").replace(/<[^>]*>/g, " ").trim();
                        const pubDate = item.date ? new Date(item.date) : new Date();
                        allRawJobs.push({
                            company: item.company.trim(),
                            jobTitle: item.position.trim(),
                            location: item.location || "Remote",
                            link: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
                            description: cleanDesc,
                            pubDate: pubDate,
                            source: "RemoteOK"
                        });
                    }
                });
            } catch (err) {
                console.error("Error parsing RemoteOK API:", err);
            }
        }

        // 3. Process Arbeitnow API
        if (arbeitnowResult.status === "fulfilled" && arbeitnowResult.value && Array.isArray(arbeitnowResult.value.data)) {
            try {
                arbeitnowResult.value.data.forEach(item => {
                    if (item && item.title && item.company_name) {
                        const cleanDesc = (item.description || "").replace(/<[^>]*>/g, " ").trim();
                        const pubDate = item.created_at ? new Date(item.created_at * 1000) : new Date();
                        allRawJobs.push({
                            company: item.company_name.trim(),
                            jobTitle: item.title.trim(),
                            location: item.location || (item.remote ? "Remote" : "Onsite"),
                            link: item.url || "",
                            description: cleanDesc,
                            pubDate: pubDate,
                            source: "Arbeitnow"
                        });
                    }
                });
            } catch (err) {
                console.error("Error parsing Arbeitnow API:", err);
            }
        }

        // 4. Process Remotive API
        if (remotiveResult.status === "fulfilled" && remotiveResult.value && Array.isArray(remotiveResult.value.jobs)) {
            try {
                remotiveResult.value.jobs.forEach(item => {
                    if (item && item.title && item.company_name) {
                        const cleanDesc = (item.description || "").replace(/<[^>]*>/g, " ").trim();
                        const pubDate = item.publication_date ? new Date(item.publication_date) : new Date();
                        allRawJobs.push({
                            company: item.company_name.trim(),
                            jobTitle: item.title.trim(),
                            location: item.candidate_required_location || "Remote",
                            link: item.url || "",
                            description: cleanDesc,
                            pubDate: pubDate,
                            source: "Remotive"
                        });
                    }
                });
            } catch (err) {
                console.error("Error parsing Remotive API:", err);
            }
        }

        // 5. Process Adzuna results
        for (let i = adzunaStartIndex; i < adzunaEndIndex; i++) {
            const adzunaResult = results[i];
            if (adzunaResult.status === "fulfilled" && adzunaResult.value) {
                try {
                    const { country, data } = adzunaResult.value;
                    if (data && Array.isArray(data.results)) {
                        data.results.forEach(item => {
                            if (item && item.title && item.company) {
                                const cleanDesc = (item.description || "").replace(/<[^>]*>/g, " ").trim();
                                const pubDate = item.created ? new Date(item.created) : new Date();
                                const companyName = item.company.display_name || "Unknown Company";
                                const locationName = item.location.display_name || "India";
                                
                                allRawJobs.push({
                                    company: companyName.trim(),
                                    jobTitle: item.title.trim(),
                                    location: locationName,
                                    link: item.redirect_url || "",
                                    description: cleanDesc,
                                    pubDate: pubDate,
                                    source: `Adzuna (${country.toUpperCase()})`
                                });
                            }
                        });
                    }
                } catch (err) {
                    console.error("Error parsing Adzuna results:", err);
                }
            }
        }

        // 6. Process Jooble results
        for (let i = joobleStartIndex; i < joobleEndIndex; i++) {
            const joobleResult = results[i];
            if (joobleResult.status === "fulfilled" && joobleResult.value && joobleResult.value.source === "Jooble") {
                try {
                    const data = joobleResult.value.data;
                    if (data && Array.isArray(data.jobs)) {
                        data.jobs.forEach(item => {
                            if (item && item.title && item.company) {
                                const cleanDesc = (item.snippet || "").replace(/<[^>]*>/g, " ").trim();
                                const pubDate = item.updated ? new Date(item.updated) : new Date();
                                
                                allRawJobs.push({
                                    company: item.company.trim(),
                                    jobTitle: item.title.trim(),
                                    location: item.location || "India",
                                    link: item.link || "",
                                    description: cleanDesc,
                                    pubDate: pubDate,
                                    source: "Jooble"
                                });
                            }
                        });
                    }
                } catch (err) {
                    console.error("Error parsing Jooble results:", err);
                }
            }
        }

        // 7. Process Direct Careers (Greenhouse/Lever) results
        const directCareersResult = results[directCareersIndex];
        if (directCareersResult.status === "fulfilled" && Array.isArray(directCareersResult.value)) {
            allRawJobs.push(...directCareersResult.value);
        }

        // 8. Process JSearch results
        const jsearchResult = results[jsearchIndex];
        if (jsearchResult.status === "fulfilled" && Array.isArray(jsearchResult.value)) {
            jsearchResult.value.forEach(item => {
                let location = "Remote";
                if (item.job_city || item.job_country) {
                    location = [item.job_city, item.job_state, item.job_country].filter(Boolean).join(", ");
                }
                allRawJobs.push({
                    company: item.employer_name || "Unknown Company",
                    jobTitle: item.job_title || "Unknown Title",
                    location: location,
                    link: item.job_apply_link || item.job_google_link || "",
                    description: item.job_description || "",
                    pubDate: item.job_posted_at_datetime_utc ? new Date(item.job_posted_at_datetime_utc) : new Date(),
                    source: "JSearch"
                });
            });
        }



        // Filter, Normalize, Freshness Check, and Score ALL matched jobs first
        const scoredJobs = [];
        const now = new Date();

        allRawJobs.forEach(rawJob => {
            if (blockedJobs.includes(rawJob.link)) {
                return; // Skip blocked jobs!
            }
            const companyKey = rawJob.company.toLowerCase().trim();
            const titleKey = rawJob.jobTitle.toLowerCase().trim();

            // A. Freshness Filter: Reject jobs older than selected freshness threshold
            const diffMs = now - (rawJob.pubDate || now);
            const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            if (diffDays > freshness) return; // Skip outdated postings based on user filter selection!

            let postedText = "Today";
            if (diffDays === 1) postedText = "1d ago";
            else if (diffDays > 1) postedText = `${diffDays}d ago`;

            // B. Work Mode Categorization & Filtering
            const locText = (rawJob.location || "").toLowerCase();
            const titleText = rawJob.jobTitle.toLowerCase();
            let workMode = "Onsite";

            if (locText.includes("remote") || titleText.includes("remote") || rawJob.source === "WeWorkRemotely" || rawJob.source === "Remotive") {
                workMode = "Remote";
            } else if (locText.includes("hybrid") || titleText.includes("hybrid")) {
                workMode = "Hybrid";
            }

            // Skip remote jobs if user did not include them or filter by geographical preference
            if (workMode === "Remote") {
                if (!includeRemote) {
                    return;
                }
                const isIndiaRemote = isIndianLocation(rawJob.location);
                if (remotePrefIndia && !remotePrefOutside && !isIndiaRemote) {
                    return; // Skip if user prefers only Indian remote and this is outside
                }
                if (remotePrefOutside && !remotePrefIndia && isIndiaRemote) {
                    return; // Skip if user prefers only outside India remote and this is Indian
                }
                if (!remotePrefIndia && !remotePrefOutside) {
                    return; // Skip remote entirely if both unchecked
                }
            }

            // Query filter parameter check
            if (workModeParam !== "all" && workModeParam.toLowerCase() !== workMode.toLowerCase()) {
                return; // Skip if work mode does not match user's custom filter criteria!
            }

            // User profile preferences check (strict database filters)
            if (userPrefMode !== "Any") {
                if (userPrefMode.toLowerCase() === "remote" && workMode !== "Remote") return;
                if (userPrefMode.toLowerCase() === "onsite" && workMode === "Remote") return;
                if (userPrefMode.toLowerCase() === "hybrid" && workMode === "Remote") return;
            }

            // Strict Location Filtering:
            // If the job is onsite or hybrid, and target locations are specified, require a match
            if (workMode !== "Remote" && prefLocations.length > 0) {
                const isLocMatch = prefLocations.some(loc => 
                    locText.includes(loc.toLowerCase()) || 
                    loc.toLowerCase().includes(locText)
                );
                if (!isLocMatch) {
                    return; // Skip onsite/hybrid jobs that don't match target locations!
                }
            }

            // C. Experience level matching filter
            if (!isExperienceMatch(userPrefExp, rawJob.jobTitle, rawJob.description)) {
                return; // Skip mismatching experience requirements!
            }

            // D. Role Filter
            const matchesRole = targetRoles.length === 0 || targetRoles.some(role => 
                titleText.includes(role) || 
                companyKey.includes(role)
            );

            if (matchesRole) {
                const { matchPercent, matchedSkills, missingSkills } = calculateMatchScore(
                    userSkills,
                    targetRoles,
                    resumeText,
                    rawJob.jobTitle,
                    rawJob.description,
                    workMode,
                    userPrefMode
                );

                // Deterministic pseudo-random salary between 12 - 28 LPA
                const charSum = companyKey.charCodeAt(0) + titleKey.charCodeAt(0);
                const salary = 12 + (charSum % 17);

                // Auto-apply only if match score is high (>= 75)
                const isEasyApply = matchPercent >= 75 && (charSum % 2) === 0;

                scoredJobs.push({
                    company: rawJob.company,
                    jobTitle: rawJob.jobTitle,
                    location: rawJob.location || "Remote",
                    workMode: workMode,
                    employmentType: "Full-time",
                    salary: salary,
                    isEasyApply: isEasyApply,
                    link: rawJob.link,
                    matchPercent: matchPercent,
                    matchedSkills: matchedSkills,
                    missingSkills: missingSkills,
                    source: rawJob.source,
                    postedDaysAgo: postedText,
                    pubDate: rawJob.pubDate || now,
                    description: rawJob.description || ""
                });
            }
        });

        // 8. Deduplicate and sort current live fetch
        let processedJobs = [];
        const seenCompanies = new Set();
        const seenLinks = new Set();

        // Add all live search links to seenLinks initially
        scoredJobs.forEach(job => {
            if (job.link) seenLinks.add(job.link);
        });

        const deduplicateAndSort = (jobs) => {
            if (sortByParam === "date") {
                jobs.sort((a, b) => b.pubDate - a.pubDate);
            } else {
                jobs.sort((a, b) => b.matchPercent - a.matchPercent);
            }
            
            const results = [];
            jobs.forEach(job => {
                const companyKey = job.company.toLowerCase().trim();
                if (seenCompanies.has(companyKey) || dbAppliedCompanies.has(companyKey) || seenLinks.has(job.link)) {
                    return;
                }
                seenCompanies.add(companyKey);
                if (job.link) seenLinks.add(job.link);
                results.push(job);
            });
            return results;
        };

        processedJobs = deduplicateAndSort(scoredJobs);

        // A. Caching Top-Up: If we have less than 10 jobs, pull from MongoDB CachedJob pool!
        if (processedJobs.length < 10) {
            try {
                // Find cached jobs that match user's target roles
                const cachedDocs = await CachedJob.find({
                    $or: targetRoles.map(role => ({
                        $or: [
                            { jobTitle: { $regex: role, $options: "i" } },
                            { company: { $regex: role, $options: "i" } }
                        ]
                    }))
                }).limit(50).lean();

                if (cachedDocs.length > 0) {
                    const cachedScored = [];
                    cachedDocs.forEach(cachedJob => {
                        if (blockedJobs.includes(cachedJob.link)) {
                            return; // Skip blocked jobs!
                        }
                        // Avoid duplicates of jobs we just fetched
                        const companyKey = cachedJob.company.toLowerCase().trim();
                        if (seenCompanies.has(companyKey) || dbAppliedCompanies.has(companyKey) || seenLinks.has(cachedJob.link)) {
                            return;
                        }

                        const locText = (cachedJob.location || "").toLowerCase();
                        const titleText = cachedJob.jobTitle.toLowerCase();
                        let workMode = "Onsite";
                        if (locText.includes("remote") || titleText.includes("remote") || cachedJob.source.includes("WeWorkRemotely") || cachedJob.source.includes("Remotive")) {
                            workMode = "Remote";
                        } else if (locText.includes("hybrid") || titleText.includes("hybrid")) {
                            workMode = "Hybrid";
                        }

                        // STRICT EXCLUSION CHECK 1: Remote preferences
                        if (workMode === "Remote") {
                            if (!includeRemote) return;
                            const isIndiaRemote = isIndianLocation(cachedJob.location);
                            if (remotePrefIndia && !remotePrefOutside && !isIndiaRemote) return;
                            if (remotePrefOutside && !remotePrefIndia && isIndiaRemote) return;
                            if (!remotePrefIndia && !remotePrefOutside) return;
                        }

                        // STRICT EXCLUSION CHECK 2: Work mode filters
                        if (userPrefMode !== "Any") {
                            if (userPrefMode.toLowerCase() === "remote" && workMode !== "Remote") return;
                            if (userPrefMode.toLowerCase() === "onsite" && workMode === "Remote") return;
                            if (userPrefMode.toLowerCase() === "hybrid" && workMode === "Remote") return;
                        }

                        // STRICT EXCLUSION CHECK 2.5: Dashboard's current-run work mode filter
                        if (workModeParam !== "all" && workModeParam.toLowerCase() !== workMode.toLowerCase()) {
                            return;
                        }

                        // STRICT EXCLUSION CHECK 3: Onsite/Hybrid Location filters
                        if (workMode !== "Remote" && prefLocations.length > 0) {
                            const isLocMatch = prefLocations.some(loc => 
                                locText.includes(loc.toLowerCase()) || 
                                loc.toLowerCase().includes(locText)
                            );
                            if (!isLocMatch) {
                                return; // Skip onsite/hybrid cached jobs that don't match target locations!
                            }
                        }

                        // STRICT EXCLUSION CHECK 4: Experience level filter
                        if (!isExperienceMatch(userPrefExp, cachedJob.jobTitle, cachedJob.description || "")) {
                            return; // Skip mismatching experience requirements!
                        }

                        const { matchPercent, matchedSkills, missingSkills } = calculateMatchScore(
                            userSkills,
                            targetRoles,
                            resumeText,
                            cachedJob.jobTitle,
                            cachedJob.description,
                            workMode,
                            userPrefMode
                        );

                        // Format pubDate nicely
                        const diffMs = now - (cachedJob.pubDate || now);
                        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                        let postedText = "Today";
                        if (diffDays === 1) postedText = "1d ago";
                        else if (diffDays > 1) postedText = `${diffDays}d ago`;

                        const charSum = companyKey.charCodeAt(0) + titleText.charCodeAt(0);
                        const salary = cachedJob.salary || (12 + (charSum % 17));
                        const isEasyApply = matchPercent >= 75 && (charSum % 2) === 0;

                        cachedScored.push({
                            company: cachedJob.company,
                            jobTitle: cachedJob.jobTitle,
                            location: cachedJob.location || "Remote",
                            workMode: workMode,
                            employmentType: cachedJob.employmentType || "Full-time",
                            salary: salary,
                            isEasyApply: isEasyApply,
                            link: cachedJob.link,
                            matchPercent: matchPercent,
                            matchedSkills: matchedSkills,
                            missingSkills: missingSkills,
                            source: `${cachedJob.source} (Cache)`,
                            postedDaysAgo: postedText,
                            pubDate: cachedJob.pubDate || now
                        });
                    });

                    if (cachedScored.length > 0) {
                        const extraJobs = deduplicateAndSort(cachedScored);
                        processedJobs.push(...extraJobs);
                    }
                }
            } catch (cacheErr) {
                console.error("Top-up from cache failed:", cacheErr);
            }
        }

        // B. Save newly fetched raw jobs to CachedJob for other users/future searches
        if (scoredJobs.length > 0) {
            try {
                const cacheOperations = scoredJobs.map(job => ({
                    updateOne: {
                        filter: { link: job.link },
                        update: { $setOnInsert: {
                            company: job.company,
                            jobTitle: job.jobTitle,
                            location: job.location,
                            workMode: job.workMode,
                            employmentType: job.employmentType,
                            salary: job.salary,
                            link: job.link,
                            description: job.description || "",
                            source: job.source,
                            pubDate: job.pubDate || now
                        }},
                        upsert: true
                    }
                }));
                if (cacheOperations.length > 0) {
                    await CachedJob.bulkWrite(cacheOperations, { ordered: false });
                }
            } catch (cacheWriteErr) {
                if (cacheWriteErr.code !== 11000) {
                    console.error("Caching bulkWrite failed:", cacheWriteErr);
                }
            }
        }

        // C. Progressive Query Relaxation: If results still < 10, relax strict onsite location constraints
        if (processedJobs.length < 10 && prefLocations.length > 0) {
            const relaxedScored = [];
            allRawJobs.forEach(rawJob => {
                if (blockedJobs.includes(rawJob.link)) {
                    return; // Skip blocked jobs!
                }
                const companyKey = rawJob.company.toLowerCase().trim();
                const titleKey = rawJob.jobTitle.toLowerCase().trim();
                if (seenCompanies.has(companyKey) || dbAppliedCompanies.has(companyKey)) {
                    return;
                }

                // Experience check constraint
                if (!isExperienceMatch(userPrefExp, rawJob.jobTitle, rawJob.description)) {
                    return;
                }

                const locText = (rawJob.location || "").toLowerCase();
                const titleText = rawJob.jobTitle.toLowerCase();
                let workMode = "Onsite";
                if (locText.includes("remote") || titleText.includes("remote") || rawJob.source === "WeWorkRemotely" || rawJob.source === "Remotive") {
                    workMode = "Remote";
                } else if (locText.includes("hybrid") || titleText.includes("hybrid")) {
                    workMode = "Hybrid";
                }

                // STRICT EXCLUSION CHECK: Dashboard's current-run work mode filter
                if (workModeParam !== "all" && workModeParam.toLowerCase() !== workMode.toLowerCase()) {
                    return;
                }

                // Respect remote settings
                if (workMode === "Remote") {
                    if (!includeRemote) return;
                    const isIndiaRemote = isIndianLocation(rawJob.location);
                    if (remotePrefIndia && !remotePrefOutside && !isIndiaRemote) return;
                    if (remotePrefOutside && !remotePrefIndia && isIndiaRemote) return;
                    if (!remotePrefIndia && !remotePrefOutside) return;
                }

                // Country boundary constraint:
                // Only allow onsite/hybrid jobs if their country code matches at least one user preferred location country
                if (workMode !== "Remote" && prefLocations.length > 0) {
                    const jobCountry = getCountryCode(rawJob.location);
                    const isSameCountry = jobCountry !== "unknown" && prefLocations.some(prefLoc => getCountryCode(prefLoc) === jobCountry);
                    if (!isSameCountry) {
                        return; // Do not cross country boundaries!
                    }
                }

                const matchesRole = targetRoles.length === 0 || targetRoles.some(role => 
                    titleText.includes(role) || 
                    companyKey.includes(role)
                );

                if (matchesRole) {
                    const { matchPercent, matchedSkills, missingSkills } = calculateMatchScore(
                        userSkills,
                        targetRoles,
                        resumeText,
                        rawJob.jobTitle,
                        rawJob.description,
                        workMode,
                        userPrefMode
                    );

                    const charSum = companyKey.charCodeAt(0) + titleKey.charCodeAt(0);
                    const salary = 12 + (charSum % 17);

                    const diffMs = now - (rawJob.pubDate || now);
                    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                    let postedText = "Today";
                    if (diffDays === 1) postedText = "1d ago";
                    else if (diffDays > 1) postedText = `${diffDays}d ago`;

                    // Auto-apply only if match score is high (>= 75)
                    const isEasyApply = matchPercent >= 75 && (charSum % 2) === 0;

                    relaxedScored.push({
                        company: rawJob.company,
                        jobTitle: rawJob.jobTitle,
                        location: rawJob.location || "Remote",
                        workMode: workMode,
                        employmentType: "Full-time",
                        salary: salary,
                        isEasyApply: isEasyApply,
                        link: rawJob.link,
                        matchPercent: matchPercent,
                        matchedSkills: matchedSkills,
                        missingSkills: missingSkills,
                        source: `${rawJob.source} (Broadened)`,
                        postedDaysAgo: postedText,
                        pubDate: rawJob.pubDate || now
                    });
                }
            });

            if (relaxedScored.length > 0) {
                const extraRelaxed = deduplicateAndSort(relaxedScored);
                processedJobs.push(...extraRelaxed);
            }
        }

        // Trigger dynamic notification
        try {
            const topMatch = processedJobs.find(j => j.matchPercent >= 80);
            if (topMatch) {
                await createNotification(
                    req.user.id,
                    `AI Agent detected a high-scoring job match: ${topMatch.jobTitle} at ${topMatch.company} (${topMatch.matchPercent}% match)!`,
                    "match"
                );
            } else {
                await createNotification(
                    req.user.id,
                    `AI Job Search completed: analyzed ${processedJobs.length} jobs matching your preferences.`,
                    "match"
                );
            }
        } catch (notificationErr) {
            console.error("Failed to generate search notification:", notificationErr);
        }

        return res.status(200).json({
            success: true,
            jobs: processedJobs.slice(0, 20),
            searchNotice: searchNotice || undefined
        });

    } catch (error) {
        console.error("Multi-source Live Job Feed Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch live job postings",
            error: error.message
        });
    }
};

module.exports = {
    getLiveJobMatches,
    isExperienceMatch,
    calculateMatchScore,
    checkAndIncrementQuota
};
