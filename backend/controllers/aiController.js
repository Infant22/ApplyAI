const User = require("../models/User");

/**
 * Controller to draft custom answers using Gemini LLM API
 * or fall back to a dynamic templated answer if the API key is not present.
 */
const draftAnswer = async (req, res) => {
    try {
        const { question, jobTitle, company, description } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                message: "Question parameter is required"
            });
        }

        // Fetch user metadata for personalization
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const userSkills = user.skills && user.skills.length > 0 
            ? user.skills.slice(0, 5).join(", ") 
            : "React, Node.js, JavaScript, Python";
        const experienceText = user.experience 
            ? `${user.experience} years` 
            : "strong technical foundation";
        const educationText = user.education || "relevant academic coursework";
        const resumeText = user.resumeText || "";

        let draftText = "";

        // Check if Gemini API key is configured
        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are a professional job application assistant. Write a short, highly compelling, and concise answer (strictly under 100 words) for the following job application question.
      
Job Title: ${jobTitle || "Software Developer"}
Company: ${company || "Target Company"}
Job Description: ${description || "Building high quality user interfaces and scalable services."}

Candidate Profile:
- Key Skills: ${userSkills}
- Experience Level: ${experienceText}
- Education Background: ${educationText}
- Resume Context: ${resumeText.substring(0, 1500)}

Question: "${question}"

Answer directly using the first-person perspective ("I"), in a professional, concise tone. Do not wrap the answer in quotes or include explanations.`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                        draftText = data.candidates[0].content.parts[0].text.trim();
                    }
                } else {
                    console.error("Gemini API call failed with status:", response.status);
                }
            } catch (err) {
                console.error("Failed to query Gemini API:", err);
            }
        }

        // Local Rule-Based Template Fallback (if no API key, or API call failed)
        if (!draftText) {
            const parsedSkills = user.skills && user.skills.length > 0 
                ? user.skills.slice(0, 3).join(", ") 
                : "full-stack development";
            
            draftText = `I am very excited about the ${jobTitle || "Developer"} position at ${company || "your company"}. With my background in software development, ${experienceText} of experience, and specific expertise in ${parsedSkills}, I believe I can make an immediate contribution to your engineering objectives. I am highly motivated by your product mission and eager to bring my problem-solving skills to your team.`;
        }

        return res.status(200).json({
            success: true,
            answer: draftText
        });

    } catch (error) {
        console.error("Drafting error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to draft application answer",
            error: error.message
        });
    }
};

const draftCoverLetter = async (req, res) => {
    try {
        const { jobTitle, company, description } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const userSkills = user.skills && user.skills.length > 0 
            ? user.skills.slice(0, 6).join(", ") 
            : "React, Node.js, JavaScript, Python";
        const experienceText = user.experience 
            ? `${user.experience} years` 
            : "strong technical foundation";
        const educationText = user.education || "relevant academic coursework";
        const resumeText = user.resumeText || "";

        let coverLetter = "";

        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are a professional hiring consultant. Write a persuasive, professional cover letter (strictly under 200 words) for the following job application.
     
Job Title: ${jobTitle || "Software Developer"}
Company: ${company || "Target Company"}
Job Description: ${description || "Building high quality user interfaces and scalable services."}

Candidate Profile:
- Key Skills: ${userSkills}
- Experience Level: ${experienceText}
- Education Background: ${educationText}
- Resume Context: ${resumeText.substring(0, 1500)}

Write it in a standard cover letter format. Start with "Dear Hiring Manager,". Keep it highly tailored to the job description and highlight key skills. Do not include address blocks or dates, just start directly with the greeting. Do not wrap the output in quotes.`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                        coverLetter = data.candidates[0].content.parts[0].text.trim();
                    }
                } else {
                    console.error("Gemini API Cover Letter call failed with status:", response.status);
                }
            } catch (err) {
                console.error("Failed to query Gemini API for cover letter:", err);
            }
        }

        // Fallback Template
        if (!coverLetter) {
            const parsedSkills = user.skills && user.skills.length > 0 
                ? user.skills.slice(0, 4).join(", ") 
                : "full-stack development";
            
            coverLetter = `Dear Hiring Manager,

I am writing to express my enthusiastic interest in the ${jobTitle || "Developer"} position at ${company || "your company"}. With my background in software development, ${experienceText} of hands-on experience, and specific expertise in ${parsedSkills}, I believe I can make an immediate contribution to your engineering objectives.

Throughout my career, I have focused on building scalable, user-centric software solutions. I am highly motivated by ${company || "your company"}'s product goals and look forward to the opportunity to discuss how my qualifications align with your requirements.

Thank you for your time and consideration.

Sincerely,
${user.name || "Candidate"}`;
        }

        return res.status(200).json({
            success: true,
            coverLetter
        });

    } catch (error) {
        console.error("Cover letter drafting error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to draft cover letter",
            error: error.message
        });
    }
};

const getResumeAdvice = async (req, res) => {
    try {
        const { jobTitle, company, description } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const userSkills = user.skills || [];
        const resumeText = user.resumeText || "";
        const experienceText = user.experience ? `${user.experience} years` : "Entry level";

        let adviceText = "";

        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are a professional ATS resume scanner. Analyze the candidate's resume keywords against the job description.
     
Job Title: ${jobTitle || "Software Developer"}
Company: ${company || "Target Company"}
Job Description: ${description || "Building high quality user interfaces and scalable services."}

Candidate Resume:
${resumeText.substring(0, 2000)}

Return a raw JSON object (with no markup, no quotes wrapper, and no explanations, just the JSON text) containing:
- missingKeywords: an array of strings representing up to 5 critical skills or terms present in the job description but completely missing from the candidate's resume.
- suggestions: an array of up to 4 strings recommending specific bullet point adjustments or edits the candidate should make to their resume experience.
- score: an integer between 35 and 95 representing the current ATS match score percentage.

Example format:
{
  "missingKeywords": ["GraphQL", "Docker"],
  "suggestions": ["Add a bullet point showing Kubernetes scaling experience.", "Rewrite Java summary to detail REST APIs."],
  "score": 75
}`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                        const rawContent = data.candidates[0].content.parts[0].text.trim();
                        const cleanJson = rawContent.replace(/```json|```/g, "").trim();
                        adviceText = JSON.parse(cleanJson);
                    }
                } else {
                    console.error("Gemini API Resume Advice call failed with status:", response.status);
                }
            } catch (err) {
                console.error("Failed to query Gemini API for resume advice:", err);
            }
        }

        // Fallback Template if API key missing or parse failed
        if (!adviceText) {
            const defaults = ["CI/CD pipelines", "TypeScript type-safety", "Unit testing frameworks"];
            const suggestions = [
                `Explicitly add details of your experiences as a ${jobTitle || 'Developer'} to your resume summary.`,
                `Add concrete achievements matching the requirements of ${company || 'this company'}.`,
                "Include stats (e.g. 'reduced latency by 15%', 'deployed 5+ projects') to make achievements quantifiable."
            ];
            
            let score = 55;
            if (userSkills.length > 0) {
                score += Math.min(userSkills.length * 5, 35);
            }

            adviceText = {
                missingKeywords: defaults,
                suggestions: suggestions,
                score: score
            };
        }

        return res.status(200).json({
            success: true,
            advice: adviceText
        });

    } catch (error) {
        console.error("Resume advice error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch resume tailoring recommendations",
            error: error.message
        });
    }
};

const generateInterviewPrep = async (req, res) => {
    try {
        const { jobTitle, company, description } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const userSkills = (user.skills && user.skills.length > 0) 
            ? user.skills.join(", ") 
            : "JavaScript, React, Node.js";
        const experienceText = user.experience ? `${user.experience} years` : "Software Engineer";

        let interviewPrep = null;

        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are a Principal Tech Recruiter and Engineering Hiring Manager at ${company || "a top tech company"}.
Generate 5 high-impact interview questions with winning sample answers for a candidate applying for the ${jobTitle || "Software Engineer"} position.

Job Description Context: ${description || "Building scalable systems and modern web applications."}
Candidate Profile: Skills: ${userSkills}, Experience: ${experienceText}

Return a raw JSON object (strictly valid JSON, no markdown, no explanation) with a "questions" key containing an array of 5 objects:
{
  "questions": [
    {
      "category": "Technical | Behavioral | System Design | Role-Specific",
      "question": "The interview question",
      "answer": "A detailed, structured winning response written in first-person (using STAR method for behavioral)."
    }
  ]
}`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                        const rawContent = data.candidates[0].content.parts[0].text.trim();
                        const cleanJson = rawContent.replace(/```json|```/g, "").trim();
                        interviewPrep = JSON.parse(cleanJson);
                    }
                } else {
                    console.error("Gemini API Interview Prep call failed with status:", response.status);
                }
            } catch (err) {
                console.error("Failed to query Gemini API for interview prep:", err);
            }
        }

        // Fallback Q&A Set if API key is missing or call failed
        if (!interviewPrep || !interviewPrep.questions) {
            const comp = company || "your company";
            const title = jobTitle || "Software Engineer";
            const mainSkill = (user.skills && user.skills[0]) ? user.skills[0] : "JavaScript";

            interviewPrep = {
                questions: [
                    {
                        category: "Behavioral",
                        question: `Why do you want to join ${comp} as a ${title}?`,
                        answer: `I am impressed by ${comp}'s mission and engineering culture. With my background in ${userSkills}, I have consistently built high-performance solutions. This role perfectly aligns with my technical goals and desire to deliver impactful software.`
                    },
                    {
                        category: "Technical",
                        question: `How do you optimize performance and state management in ${mainSkill} applications?`,
                        answer: `I focus on minimizing unnecessary re-renders, profiling network requests, utilizing efficient data structures, and applying caching strategies. In my past projects, this reduced initial load times by over 30%.`
                    },
                    {
                        category: "System Design",
                        question: `How would you design a high-throughput API microservice for ${comp}?`,
                        answer: `I would design a stateless REST/gRPC service behind a API Gateway, backed by Redis for caching hot data and MongoDB/PostgreSQL with read replicas. I'd implement token bucket rate-limiting and asynchronous event queues for heavy tasks.`
                    },
                    {
                        category: "Behavioral",
                        question: `Describe a time you solved a challenging bug or technical roadblock.`,
                        answer: `In a recent production release, we encountered an intermittent memory leak under high load. I isolated the issue using memory profiling tools to trace an unclosed database subscription. Fixing the lifecycle hook stabilized memory usage and restored sub-100ms response times.`
                    },
                    {
                        category: "Role-Specific",
                        question: `What is your approach to code reviews and maintaining software quality?`,
                        answer: `I advocate for automated linting and CI/CD testing pipelines. During code reviews, I focus on readability, test coverage, architectural consistency, and security best practices, always providing constructive feedback.`
                    }
                ]
            };
        }

        return res.status(200).json({
            success: true,
            interviewPrep
        });

    } catch (error) {
        console.error("Interview prep error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate interview preparation questions",
            error: error.message
        });
    }
};

const analyzeInterviewAnswer = async (req, res) => {
    try {
        const { question, expectedAnswer, userAnswer } = req.body;

        if (!question || !userAnswer) {
            return res.status(400).json({
                success: false,
                message: "Question and userAnswer parameters are required"
            });
        }

        let evaluation = null;

        // Try Google Gemini API first
        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are a professional technical recruiter and engineering manager. Analyze the candidate's mock interview response against the question and the target ideal answer.

Question: "${question}"
Target Ideal Answer: "${expectedAnswer || "No template answer provided."}"
Candidate's Response: "${userAnswer}"

Analyze the candidate's answer and return your response in strict, clean JSON format. Do not use markdown code fence blocks (like \`\`\`json) or any explanations. Return only the raw JSON string matching this exact structure:
{
  "score": 8,
  "strengths": ["Clear explanation", "Good keywords used"],
  "weaknesses": ["Missed caching strategy details", "Response could be more structured"],
  "suggestedImprovement": "Focus more on detail X and structure Y."
}`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                        const rawText = data.candidates[0].content.parts[0].text.trim();
                        const cleanJson = rawText.replace(/```json|```/g, "").trim();
                        evaluation = JSON.parse(cleanJson);
                    }
                }
            } catch (err) {
                console.error("Gemini Interview Analysis Error:", err);
            }
        }

        // Local Fallback if Gemini fails or is not configured
        if (!evaluation) {
            const cleanAnswer = userAnswer.toLowerCase();
            let score = 5;
            const strengths = [];
            const weaknesses = [];

            if (cleanAnswer.length > 150) {
                score += 2;
                strengths.push("Detailed response covering several technical facets.");
            } else if (cleanAnswer.length < 50) {
                score -= 2;
                weaknesses.push("Response is too brief. Try to structure with more details.");
            }

            if (cleanAnswer.includes("react") || cleanAnswer.includes("hook") || cleanAnswer.includes("state")) {
                strengths.push("Correctly references modern React architecture concepts.");
            }
            if (cleanAnswer.includes("caching") || cleanAnswer.includes("redis") || cleanAnswer.includes("database")) {
                strengths.push("Shows good awareness of caching and database scaling.");
            }

            if (strengths.length === 0) {
                strengths.push("Clear communication of target goals.");
            }
            if (weaknesses.length === 0) {
                weaknesses.push("Could include more technical metrics and performance data.");
            }

            const suggestedImprovement = `To improve, structure your answer using the STAR method (Situation, Task, Action, Result). Try to include specific technical details such as system bottlenecks, specific libraries, or quantitative metrics.`;

            evaluation = {
                score: Math.max(1, Math.min(score, 10)),
                strengths,
                weaknesses,
                suggestedImprovement
            };
        }

        return res.status(200).json({
            success: true,
            score: evaluation.score,
            strengths: evaluation.strengths,
            weaknesses: evaluation.weaknesses,
            suggestedImprovement: evaluation.suggestedImprovement
        });

    } catch (error) {
        console.error("Interview Analyzer Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to analyze interview response",
            error: error.message
        });
    }
};

module.exports = {
    draftAnswer,
    draftCoverLetter,
    getResumeAdvice,
    generateInterviewPrep,
    analyzeInterviewAnswer
};

