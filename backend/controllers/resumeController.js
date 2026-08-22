const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const { parseResume } = require("../utils/resumeParser");
const { createNotification } = require("./notificationController");

const uploadResume = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a valid PDF, DOC, or DOCX file."
            });
        }

        const user = await User.findById(req.user.id);

        // Delete old resume if it exists
        if (user.resume) {
            const oldResumePath = path.join(
                __dirname,
                "../uploads/resumes",
                user.resume
            );

            if (fs.existsSync(oldResumePath)) {
                fs.unlinkSync(oldResumePath);
            }
        }

        // Save new resume filename
        user.resume = req.file.filename;

        // Extract raw text if it is a PDF
        let parsedDetails = null;
        console.log("Uploaded file details:", req.file);
        if (req.file.mimetype === "application/pdf" || req.file.originalname.endsWith(".pdf")) {
            try {
                const pdfBuffer = fs.readFileSync(req.file.path);
                parsedDetails = await parseResume(pdfBuffer);
                user.resumeText = parsedDetails.rawText;

                // Validation & Safe Auto-Save of parsed metadata:
                // Only overwrite/save fields if they are currently blank/empty in the database
                if (parsedDetails.phone) {
                    const cleanPhone = parsedDetails.phone.replace(/[^0-9+]/g, "");
                    if (cleanPhone.length >= 7 && (!user.phone || user.phone.trim() === "")) {
                        user.phone = parsedDetails.phone.trim();
                    }
                }

                if (parsedDetails.education && parsedDetails.education.trim().length >= 5) {
                    if (!user.education || user.education.trim() === "") {
                        user.education = parsedDetails.education.trim();
                    }
                }

                if (parsedDetails.experience && parsedDetails.experience.trim().length > 0) {
                    if (!user.experience || user.experience.trim() === "") {
                        user.experience = parsedDetails.experience.trim();
                    }
                }

                if (parsedDetails.currentTitle && parsedDetails.currentTitle.trim().length >= 5) {
                    if (!user.currentTitle || user.currentTitle.trim() === "") {
                        user.currentTitle = parsedDetails.currentTitle.trim();
                    }
                }

                if (Array.isArray(parsedDetails.skills) && parsedDetails.skills.length > 0) {
                    // Union parsed skills with existing skills to prevent loss of manual selections
                    const uniqueSkills = new Set([...(user.skills || []), ...parsedDetails.skills]);
                    user.skills = Array.from(uniqueSkills);
                }

            } catch (err) {
                console.error("Resume PDF parsing failed:", err);
            }
        }

        await user.save();

        // Trigger notification
        try {
            await createNotification(
                req.user.id,
                "Resume uploaded and parsed successfully! Updated your education, experience, and skills.",
                "resume"
            );
        } catch (notificationErr) {
            console.error("Failed to create resume upload notification:", notificationErr);
        }

        return res.status(200).json({
            message: "Resume Uploaded Successfully",
            file: req.file.filename,
            parsedDetails
        });

    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

const getResume = async (req, res) => {
    try {

        const user = await User.findById(req.user.id);

        if (!user.resume) {
            return res.status(404).json({
                message: "No resume uploaded."
            });
        }

        return res.status(200).json({
            message: "Resume Found",
            file: user.resume
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

const deleteResume = async (req, res) => {
    try {

        const user = await User.findById(req.user.id);

        if (!user.resume) {
            return res.status(404).json({
                message: "No resume uploaded."
            });
        }

        // Resume file path
        const resumePath = path.join(
            __dirname,
            "../uploads/resumes",
            user.resume
        );

        // Delete file if it exists
        if (fs.existsSync(resumePath)) {
            fs.unlinkSync(resumePath);
        }

        // Remove filename from database
        user.resume = "";
        await user.save();

        // Trigger notification
        try {
            await createNotification(
                req.user.id,
                "Resume deleted from your profile.",
                "resume"
            );
        } catch (notificationErr) {
            console.error("Failed to create resume delete notification:", notificationErr);
        }

        return res.status(200).json({
            message: "Resume Deleted Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

module.exports = {
    uploadResume,
    getResume,
    deleteResume
};