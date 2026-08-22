const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const jobApplicationRoutes = require("./routes/jobApplicationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

dotenv.config();

const app = express();

const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB();

// Import Routes
const indexRoutes = require("./routes");
const userRoutes = require("./routes/userRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Middleware
app.use(express.json());

// Set up security headers allowing cross-origin assets (avatars/resumes)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure dynamic CORS origins allowed to access the backend API
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5500", // Live Server default port
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

// Serve Uploaded Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/", indexRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobs", jobApplicationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});