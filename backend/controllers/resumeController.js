const path = require("path");
const streamifier = require("streamifier");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const { parseResume } = require("../utils/resumeParser");
const { createNotification } = require("./notificationController");

const uploadBufferToCloudinary = (buffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

const deleteCloudinaryResume = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } catch (err) {
        console.error("Failed to delete resume from Cloudinary:", err);
    }
};

const uploadResume = async (req, res) => {
    try {

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                message: "Please upload a valid PDF, DOC, or DOCX file."
            });
        }

        const user = await User.findById(req.user.id);

        const ext = path.extname(req.file.originalname).replace(".", "") || "pdf";
        const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
            folder: "applyai/resumes",
            resource_type: "raw",
            public_id: `resume-${req.user.id}-${Date.now()}`,
            format: ext
        });

        if (user.resumePublicId) {
            await deleteCloudinaryResume(user.resumePublicId);
        }

        user.resume = uploaded.secure_url;
        user.resumePublicId = uploaded.public_id;

        // Extract raw text if it is a PDF
        let parsedDetails = null;
        console.log("Uploaded file details:", {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        if (req.file.mimetype === "application/pdf" || req.file.originalname.endsWith(".pdf")) {
            try {
                const pdfBuffer = req.file.buffer;
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
            file: user.resume,
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

        await deleteCloudinaryResume(user.resumePublicId);

        user.resume = "";
        user.resumePublicId = "";
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
