const JobApplication = require("../models/JobApplication");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { createNotification } = require("./notificationController");

const createJobApplication = async (req, res) => {
    try {
        const job = await JobApplication.create({
            user: req.user.id,
            company: req.body.company,
            jobTitle: req.body.jobTitle,
            location: req.body.location,
            status: req.body.status,
            appliedDate: req.body.appliedDate,
            jobLink: req.body.jobLink,

            // New Fields
            workMode: req.body.workMode,
            employmentType: req.body.employmentType,
            experience: req.body.experience,
            salary: req.body.salary,

            // ATS Match Details
            matchPercent: req.body.matchPercent,
            matchedSkills: req.body.matchedSkills,
            missingSkills: req.body.missingSkills
        });

        // Trigger real-time email alert to applicant
        try {
            const user = await User.findById(req.user.id);
            if (user && user.email) {
                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
                            <h2 style="color: #3b82f6; margin: 0;">🚀 ApplyAI Application Alert</h2>
                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.9rem;">Your intelligent job hunt assistant</p>
                        </div>
                        <div style="line-height: 1.6; font-size: 1rem;">
                            <p>Hi <strong>${user.name || "Candidate"}</strong>,</p>
                            <p>We are excited to let you know that a new job application has been logged on your tracker!</p>
                            
                            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.1rem;">Application Details:</h3>
                                <table style="width: 100%; font-size: 0.95rem; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; color: #475569; width: 120px;">Job Title:</td>
                                        <td style="padding: 4px 0; color: #0f172a;">${job.jobTitle}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; color: #475569;">Company:</td>
                                        <td style="padding: 4px 0; color: #0f172a;">${job.company}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; color: #475569;">Location:</td>
                                        <td style="padding: 4px 0; color: #0f172a;">${job.location || "Remote"}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; color: #475569;">Work Mode:</td>
                                        <td style="padding: 4px 0; color: #0f172a;">${job.workMode || "Onsite"}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; color: #475569;">Status:</td>
                                        <td style="padding: 4px 0; color: #10b981; font-weight: bold;">${job.status}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p>You can check the status, practice mock interview questions, and tailor your resume on your <a href="http://127.0.0.1:5500/frontend/pages/dashboard.html" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Dashboard</a>.</p>
                        </div>
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
                            <p>© 2026 ApplyAI Corp. All rights reserved.</p>
                        </div>
                    </div>
                `;
                await sendEmail({
                    email: user.email,
                    subject: `🚀 Application Logged: ${job.jobTitle} at ${job.company}`,
                    html: emailHtml
                });
            }
        } catch (emailErr) {
            console.error("Failed to send application confirmation email:", emailErr);
        }

        // Trigger notification
        try {
            await createNotification(
                req.user.id,
                `Applied to ${job.jobTitle} at ${job.company} successfully!`,
                "application"
            );
        } catch (notificationErr) {
            console.error("Failed to create application notification:", notificationErr);
        }

        return res.status(201).json({
            message: "Job Application Created Successfully",
            job
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

const getAllJobApplications = async (req, res) => {
    try {

        const {
            search,
            status,
            sort,
            workMode,
            employmentType,
            minExperience,
            maxExperience,
            minSalary,
            maxSalary,
            fromDate,
            toDate
        } = req.query;

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            user: req.user.id
        };

        // Search
        if (search) {
            filter.$or = [
                { company: { $regex: search, $options: "i" } },
                { jobTitle: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ];
        }

        // Status
        if (status) {
            filter.status = status;
        }

        // Work Mode
        if (workMode) {
            filter.workMode = workMode;
        }

        // Employment Type
        if (employmentType) {
            filter.employmentType = employmentType;
        }

        // Experience Range
        if (minExperience || maxExperience) {
            filter.experience = {};

            if (minExperience)
                filter.experience.$gte = Number(minExperience);

            if (maxExperience)
                filter.experience.$lte = Number(maxExperience);
        }

        // Salary Range
        if (minSalary || maxSalary) {
            filter.salary = {};

            if (minSalary)
                filter.salary.$gte = Number(minSalary);

            if (maxSalary)
                filter.salary.$lte = Number(maxSalary);
        }

        // Applied Date Range
        if (fromDate || toDate) {
            filter.appliedDate = {};

            if (fromDate)
                filter.appliedDate.$gte = new Date(fromDate);

            if (toDate)
                filter.appliedDate.$lte = new Date(toDate);
        }

        // Sorting
        let sortOption = {};

        switch (sort) {
            case "newest":
                sortOption = { createdAt: -1 };
                break;

            case "oldest":
                sortOption = { createdAt: 1 };
                break;

            case "company_asc":
                sortOption = { company: 1 };
                break;

            case "company_desc":
                sortOption = { company: -1 };
                break;

            case "status":
                sortOption = { status: 1 };
                break;

            default:
                sortOption = { createdAt: -1 };
        }

        const totalJobs = await JobApplication.countDocuments(filter);

        const jobs = await JobApplication.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            currentPage: page,
            totalPages: Math.ceil(totalJobs / limit),
            totalJobs,
            jobs
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

const getJobApplicationById = async (req, res) => {
    try {
        const job = await JobApplication.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!job) {
            return res.status(404).json({
                message: "Job Application Not Found"
            });
        }

        return res.status(200).json(job);

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

const updateJobApplication = async (req, res) => {
    try {
        const job = await JobApplication.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!job) {
            return res.status(404).json({
                message: "Job Application Not Found"
            });
        }

        // Check for Interview invitation trigger and status changes
        const originalStatus = job.status;
        const newStatus = req.body.status || originalStatus;
        const statusChanged = req.body.status && req.body.status !== originalStatus;
        const statusChangedToInterview = req.body.status && req.body.status === "Interview" && originalStatus !== "Interview";
        const statusChangedToSelected = req.body.status && req.body.status === "Selected" && originalStatus !== "Selected";
        const statusChangedToRejected = req.body.status && req.body.status === "Rejected" && originalStatus !== "Rejected";

        job.company = req.body.company || job.company;
        job.jobTitle = req.body.jobTitle || job.jobTitle;
        job.location = req.body.location || job.location;
        job.status = req.body.status || job.status;
        job.jobLink = req.body.jobLink || job.jobLink;

        // New Fields
        job.workMode = req.body.workMode || job.workMode;
        job.employmentType = req.body.employmentType || job.employmentType;
        job.experience = req.body.experience ?? job.experience;
        job.salary = req.body.salary ?? job.salary;

        // ATS Match Details
        job.matchPercent = req.body.matchPercent ?? job.matchPercent;
        job.matchedSkills = req.body.matchedSkills || job.matchedSkills;
        job.missingSkills = req.body.missingSkills || job.missingSkills;

        await job.save();

        // Trigger notifications for status change
        if (statusChanged) {
            try {
                let msg = `Your application status for ${job.jobTitle} at ${job.company} is updated to ${newStatus}.`;
                if (statusChangedToInterview) {
                    msg = `🎉 Interview Scheduled! Your application status for ${job.jobTitle} at ${job.company} is updated to Interview.`;
                } else if (statusChangedToSelected) {
                    msg = `🏆 Congratulations! You have been Selected for ${job.jobTitle} at ${job.company}!`;
                } else if (statusChangedToRejected) {
                    msg = `Application status update: ${job.jobTitle} at ${job.company} status changed to Rejected.`;
                }
                await createNotification(req.user.id, msg, "application");
            } catch (notificationErr) {
                console.error("Failed to create status change notification:", notificationErr);
            }
        }

        if (statusChangedToInterview) {
            try {
                const user = await User.findById(req.user.id);
                if (user && user.email) {
                    const interviewHtml = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                            <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px;">
                                <h2 style="color: #6366f1; margin: 0;">🎉 Interview Scheduled!</h2>
                                <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.9rem;">Mock Prep & Practice Reminder</p>
                            </div>
                            <div style="line-height: 1.6; font-size: 1rem;">
                                <p>Hi <strong>${user.name || "Candidate"}</strong>,</p>
                                <p>Congratulations! Your application status for <strong>${job.jobTitle}</strong> at <strong>${job.company}</strong> has been updated to <strong style="color: #6366f1;">Interview</strong>.</p>
                                
                                <div style="background: #f5f3ff; border-left: 4px solid #6366f1; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 8px 0; color: #4c1d95; font-size: 1rem;">🎯 Action Recommended:</h3>
                                    <p style="margin: 0; font-size: 0.9rem; color: #5b21b6;">Use the <strong>AI Mock Interview Assistant</strong> on your dashboard to practice company-specific behavioral and technical questions, get scores, and polish your response delivery.</p>
                                </div>
                                
                                <p>Check your prep guide on the <a href="http://127.0.0.1:5500/frontend/pages/review.html" style="color: #6366f1; text-decoration: none; font-weight: bold;">Review Queue & Mock Prep Board</a>.</p>
                            </div>
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
                                <p>Best of luck from the ApplyAI team!</p>
                            </div>
                        </div>
                    `;
                    await sendEmail({
                        email: user.email,
                        subject: `🎉 Interview Scheduled: ${job.jobTitle} at ${job.company}`,
                        html: interviewHtml
                    });
                }
            } catch (emailErr) {
                console.error("Failed to send interview status confirmation email:", emailErr);
            }
        }

        return res.status(200).json({
            message: "Job Application Updated Successfully",
            job
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

const deleteJobApplication = async (req, res) => {
    try {
        const job = await JobApplication.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!job) {
            return res.status(404).json({
                message: "Job Application Not Found"
            });
        }

        await job.deleteOne();

        return res.status(200).json({
            message: "Job Application Deleted Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

module.exports = {
    createJobApplication,
    getAllJobApplications,
    getJobApplicationById,
    updateJobApplication,
    deleteJobApplication
};