const assert = require("assert");
const { isExperienceMatch, calculateMatchScore } = require("../controllers/jobFeedController");

console.log("Starting unit tests for search matching and scoring logic...\n");

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ [PASS] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`❌ [FAIL] ${name}`);
        console.error(err);
        failedTests++;
    }
}

// ----------------------------------------------------
// 1. isExperienceMatch Tests
// ----------------------------------------------------

test("isExperienceMatch - Fresher should reject Senior/Staff titles (case-insensitive)", () => {
    // Mixed case title
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "SENIOR Software Engineer"), false);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Lead developer"), false);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "staff engineer"), false);
});

test("isExperienceMatch - Fresher should accept normal Developer/Junior titles", () => {
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Software Engineer"), true);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Junior Frontend Developer"), true);
});

test("isExperienceMatch - Fresher should accept trainee exceptions overriding senior keywords", () => {
    // "Graduate Lead Program" contains Lead but has "Graduate" override
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Graduate Lead Program Trainee"), true);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Junior Team Lead"), true);
});

test("isExperienceMatch - Strict years of experience constraint (Fresher rejecting 4+ years in description)", () => {
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Software Engineer", "Required 5+ years of experience in JavaScript"), false);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Software Engineer", "We need 4-6 years of experience"), false);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Software Engineer", "Minimum 1 year of experience"), true);
});

test("isExperienceMatch - Senior should reject Intern / entry-only roles", () => {
    assert.strictEqual(isExperienceMatch("Senior (5+ years)", "Software Engineering Intern"), false);
    assert.strictEqual(isExperienceMatch("Senior (5+ years)", "Staff Engineer", "Maximum 1 year experience required"), false);
});

test("isExperienceMatch - Missing description / null fields handling", () => {
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", null, null), true);
    assert.strictEqual(isExperienceMatch("Fresher (0 years)", "Software Engineer", undefined), true);
});


// ----------------------------------------------------
// 2. calculateMatchScore Tests
// ----------------------------------------------------

test("calculateMatchScore - 0 skills matched should give minimum score", () => {
    // User has React, JD mentions Python/C++
    const userSkills = ["React"];
    const targetRoles = ["Developer"];
    const result = calculateMatchScore(userSkills, targetRoles, "", "Developer", "Required skills: Python, Java, C++", "Onsite", "Onsite");
    
    // Title match: 25. Work Mode match: 10. Skills: 0/3. Total = 35
    assert.strictEqual(result.matchPercent, 35);
    assert.deepStrictEqual(result.matchedSkills, []);
    assert.deepStrictEqual(result.missingSkills, ["Python", "Java", "C++"]);
});

test("calculateMatchScore - Case-insensitive skills match", () => {
    const userSkills = ["react", "node.js"];
    const targetRoles = ["Developer"];
    const result = calculateMatchScore(userSkills, targetRoles, "", "Developer", "We use REACT and Node.js here", "Onsite", "Onsite");
    
    // Title match: 25. Work Mode match: 10. Skills: 2/2 matched (+65). Total = 100 -> capped at 99
    assert.strictEqual(result.matchPercent, 99);
    assert.deepStrictEqual(result.matchedSkills, ["React", "Node.js"]);
});

test("calculateMatchScore - Undefined / Empty skills arrays handling", () => {
    // Shouldn't crash and should gracefully return score
    const resultEmptyUser = calculateMatchScore([], ["Developer"], "", "Developer", "React, Node.js", "Onsite", "Onsite");
    assert.ok(resultEmptyUser.matchPercent >= 35);

    const resultUndefined = calculateMatchScore(undefined, undefined, undefined, "Developer", undefined, undefined, undefined);
    assert.ok(resultUndefined.matchPercent >= 10);
});

test("calculateMatchScore - Partial skill coverage math check", () => {
    const userSkills = ["React", "Node.js"];
    const targetRoles = ["Developer"];
    // Description mentions React, Node.js, Python, Java (Total required = 4, Matched = 2)
    const result = calculateMatchScore(userSkills, targetRoles, "", "Developer", "React, Node.js, Python, Java", "Onsite", "Onsite");

    // Title: 25. Work Mode: 10. Skills ratio: 2/4 = 50% of 65% = 33%. Total = 25+10+33 = 68%
    assert.strictEqual(result.matchPercent, 68);
});

console.log(`\n========================================`);
console.log(`Test Execution Completed:`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`========================================`);

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
