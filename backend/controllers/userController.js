const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");

// ======================
// Register User
// ======================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully!",
      user: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ======================
// Login User
// ======================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid Email or Password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid Email or Password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ======================
// Get Profile (Protected)
// ======================
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    return res.status(200).json({
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      education,
      experience,
      skills,
      portfolio,
      linkedin,
      github,
      currentTitle,
      currentCompany,
      noticePeriod,
      expectedSalary,
      requireSponsorship,
      prefRoles,
      prefLocations,
      prefExperience,
      prefSalary,
      prefWorkMode,
      prefEmploymentType,
      includeRemoteJobs,
      remotePrefIndia,
      remotePrefOutside
    } = req.body;

    const user = await User.findById(req.user.id);

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (education !== undefined) user.education = education;
    if (experience !== undefined) user.experience = experience;
    if (skills !== undefined) {
      user.skills = Array.isArray(skills)
        ? skills
        : skills.split(",").map(s => s.trim()).filter(Boolean);
    }
    if (portfolio !== undefined) user.portfolio = portfolio;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (github !== undefined) user.github = github;
    
    if (currentTitle !== undefined) user.currentTitle = currentTitle;
    if (currentCompany !== undefined) user.currentCompany = currentCompany;
    if (noticePeriod !== undefined) user.noticePeriod = noticePeriod;
    if (expectedSalary !== undefined) user.expectedSalary = expectedSalary;
    if (requireSponsorship !== undefined) user.requireSponsorship = requireSponsorship;

    if (prefRoles !== undefined) {
      user.prefRoles = Array.isArray(prefRoles)
        ? prefRoles
        : prefRoles.split(",").map(r => r.trim()).filter(Boolean);
    }
    if (prefLocations !== undefined) {
      const parsedLocs = Array.isArray(prefLocations)
        ? prefLocations
        : prefLocations.split(",").map(l => l.trim()).filter(Boolean);
      user.prefLocations = parsedLocs.filter(loc => loc.toLowerCase() !== "remote");
    }
    if (prefExperience !== undefined) user.prefExperience = prefExperience;
    if (prefSalary !== undefined) user.prefSalary = prefSalary;
    if (prefWorkMode !== undefined) user.prefWorkMode = prefWorkMode;
    if (prefEmploymentType !== undefined) user.prefEmploymentType = prefEmploymentType;
    if (includeRemoteJobs !== undefined) user.includeRemoteJobs = includeRemoteJobs;
    if (remotePrefIndia !== undefined) user.remotePrefIndia = remotePrefIndia;
    if (remotePrefOutside !== undefined) user.remotePrefOutside = remotePrefOutside;

    await user.save();

    const updatedUser = await User.findById(req.user.id).select("-password");

    return res.status(200).json({
      message: "Profile Updated Successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Current Password is Incorrect"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);

        await user.save();

        return res.status(200).json({
            message: "Password Changed Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

// ======================
// Forgot Password Request
// ======================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success to prevent enumeration attacks
      return res.status(200).json({
        message: "If an account with that email exists, a password reset link has been sent."
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Reset url points to frontend page
    const frontendHost = process.env.FRONTEND_URL || "http://127.0.0.1:5500";
    const resetUrl = `${frontendHost}/frontend/pages/reset-password.html?token=${resetToken}`;
    
    // Also log to console so users can grab the URL without mail SMTP set up
    console.log("-----------------------------------------");
    console.log(` Reset URL generated for: ${user.email}`);
    console.log(` Link: ${resetUrl}`);
    console.log("-----------------------------------------");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; text-align: center;">Reset Your Password</h2>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset the password associated with your ApplyAI account. Click the button below to reset your password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #64748b;">${resetUrl}</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">ApplyAI Job Agent System &copy; 2026</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request - ApplyAI",
        html,
      });

      return res.status(200).json({
        message: "If an account with that email exists, a password reset link has been sent."
      });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error("Email send error:", err);
      return res.status(500).json({ message: "Email could not be sent. Please try again." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ======================
// Reset Password Submission
// ======================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ======================
// Google Login / Sign Up
// ======================
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential token is required" });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      console.error("Google token verification failed:", err);
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      user = new User({
        name,
        email,
        googleId,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "Google Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ======================
// Upload Avatar
// ======================
const uploadAvatarController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Delete old avatar file if it exists
    if (user.avatar) {
      const fs = require("fs");
      const oldPath = require("path").join(__dirname, "..", "uploads", "avatars", user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save just the filename to DB
    user.avatar = req.file.filename;
    await user.save();

    return res.status(200).json({
      message: "Avatar uploaded successfully!",
      avatar: req.file.filename,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const deleteAvatarController = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.avatar) {
      const fs = require("fs");
      const oldPath = require("path").join(__dirname, "..", "uploads", "avatars", user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    user.avatar = "";
    await user.save();

    return res.status(200).json({
      message: "Avatar removed successfully!",
      avatar: "",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const blockJob = async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ message: "Job link is required" });
    }
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { blockedJobs: link } });
    return res.status(200).json({ message: "Job marked as Not Interested successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    googleLogin,
    uploadAvatarController,
    deleteAvatarController,
    blockJob,
};
