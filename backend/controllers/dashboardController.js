const mongoose = require("mongoose");
const JobApplication = require("../models/JobApplication");

const getDashboard = async (req, res) => {
    try {
        const totalJobs = await JobApplication.countDocuments({
            user: req.user.id
        });

        const applied = await JobApplication.countDocuments({
            user: req.user.id,
            status: "Applied"
        });

        const interview = await JobApplication.countDocuments({
            user: req.user.id,
            status: "Interview"
        });

        const selected = await JobApplication.countDocuments({
            user: req.user.id,
            status: "Selected"
        });

        const rejected = await JobApplication.countDocuments({
            user: req.user.id,
            status: "Rejected"
        });

        // Last 7 days activity aggregation
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        sixDaysAgo.setHours(0, 0, 0, 0);

        const activityData = await JobApplication.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(req.user.id),
                    appliedDate: { $gte: sixDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedDate" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const timeline = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            
            const match = activityData.find(item => item._id === dateStr);
            timeline.push({
                date: dateStr,
                count: match ? match.count : 0
            });
        }

        return res.status(200).json({
            totalJobs,
            applied,
            interview,
            selected,
            rejected,
            timeline
        });

    } catch (error) {
        console.error("Dashboard statistics retrieval failed:", error);
        return res.status(500).json({
            message: "Server Error"
        });
    }
};

module.exports = {
    getDashboard
};