const { PDFParse } = require("pdf-parse");

// Common technical and soft skills list
const SKILLS_LIST = [
  // Tech Skills
  "React", "Node.js", "Python", "AWS", "Docker", "JavaScript", "TypeScript", "SQL", "MongoDB", "Java",
  "C++", "HTML", "CSS", "Express", "Django", "Flask", "Kubernetes", "Git", "GitHub", "Linux",
  "Redux", "Angular", "Vue.js", "PHP", "Laravel", "Ruby", "Rails", "Rust", "Go", "Swift", "Kotlin",
  "Android", "iOS", "Flutter", "Firebase", "PostgreSQL", "MySQL", "GraphQL", "REST API", "CI/CD",
  "Jenkins", "Terraform", "Google Cloud", "Azure", "Sass", "Webpack", "Babel", "Jest", "Mocha",
  // Soft Skills
  "Communication", "Teamwork", "Leadership", "Adaptability", "Problem Solving", "Time Management",
  "Critical Thinking", "Creativity", "Conflict Resolution", "Interpersonal Skills", "Emotional Intelligence"
];

/**
 * Parses raw PDF buffer and extracts structured resume details
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<Object>}
 */
const parseResume = async (pdfBuffer) => {
  const parser = new PDFParse(new Uint8Array(pdfBuffer));
  const data = await parser.getText();
  const text = data.text;

  // 1. Extract Email
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emails = text.match(emailRegex) || [];
  const email = emails[0] || "";

  // 2. Extract Phone Number
  const phoneRegex = /(\+?\d{1,4}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g;
  const phones = text.match(phoneRegex) || [];
  const phone = phones[0] || "";

  // 3. Match Skills against list
  const matchedSkills = [];
  SKILLS_LIST.forEach(skill => {
    // Escaping special regex characters in skill names
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
    if (regex.test(text)) {
      matchedSkills.push(skill);
    }
  });

  // 4. Extract Years of Experience
  const expRegex = /(\d+)\+?\s*(?:yr|year)s?\s+(?:of\s+)?experience/i;
  const expMatch = text.match(expRegex);
  const experience = expMatch ? expMatch[1] : "";

  // 5. Extract Education Details (Simple line matching)
  let education = "";
  const eduKeywords = ["bachelor", "master", "doctor", "b.tech", "m.tech", "b.e.", "m.e.", "bs", "ms", "phd", "university", "college", "institute"];
  const lines = text.split("\n");
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (eduKeywords.some(keyword => lowerLine.includes(keyword))) {
      education = line.trim();
      break;
    }
  }

  // 6. Extract Current/Target Job Title
  let currentTitle = "";
  const titleKeywords = ["developer", "engineer", "designer", "consultant", "analyst", "administrator", "architect", "specialist", "manager"];
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (titleKeywords.some(keyword => lowerLine.includes(keyword)) && !lowerLine.includes("experience") && !lowerLine.includes("education")) {
      currentTitle = line.trim();
      break;
    }
  }

  return {
    rawText: text,
    email,
    phone,
    skills: matchedSkills,
    experience,
    education,
    currentTitle
  };
};

module.exports = {
  parseResume
};
