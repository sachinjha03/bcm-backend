const express = require('express');
const router = express.Router();
const BiaData = require('../models/BusinessImpactAnalysisData');
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');
const Notification = require('../models/Notification'); // ✅ Add this

// Utility to generate a unique dataId
const generateDataId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let dataId = '';
    for (let i = 0; i < length; i++) {
        dataId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return dataId;
};

// POST /api/add-business-impact-analysis-data
router.post('/add-business-impact-analysis-data', verifyToken, async (req, res) => {
    try {
        const {
            company,
            department,
            module,
            formData,
            createdBy,
            userId,
        } = req.body;

        if (!company || !department || !module || !formData || !createdBy || !userId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newEntry = new BiaData({
            dataId: generateDataId(),
            company,
            department,
            module,
            formData,
            createdBy,
            userId,
            currentStatus: 'Pending for Owner Approval',
        });

        const saved = await newEntry.save();

        // ✅ Send notifications to owner/admin of the same company/department/module
        try {
            const senderUser = await User.findById(req.user.userId);

            if (senderUser) {
                const relatedUsers = await User.find({
                    company: senderUser.company,
                    department: senderUser.department,
                    module: senderUser.module,
                    role: { $in: ['owner', 'admin', 'super admin'] }
                });

                const notifications = relatedUsers.map(user => ({
                    recipient: user._id,
                    sender: senderUser._id,
                    message: `New BIA data submitted by ${senderUser.name}.`,
                    forRole: user.role,
                    department: user.department,
                    company: user.company,
                    module: user.module
                }));

                await Notification.insertMany(notifications);
            }
        } catch (err) {
            console.error("Error creating notifications for BIA submission:", err);
        }

        res.status(201).json({ success: true, message: 'BIA data saved successfully', data: saved });

    } catch (error) {
        console.error('Error saving BIA data:', error);
        res.status(500).json({ success: false, message: 'Server error', error });
    }
});


// DELETE THE BUSINESS IMPACT ANALYSIS DATA
router.delete("/delete-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
    try {
        const id = req.params.id
        const isDataExist = await BiaData.findById(id)
        if (!isDataExist) {
            return res.status(404).json({ success: false, reason: "Data Doesn't Exist" });
        }
        const response = await BiaData.findByIdAndDelete(id)
        res.status(200).json({ success: true, data: response })
    } catch (err) {
        res.status(400).json({ success: false, reason: err })
    }
})

// PUT /api/update-business-impact-analysis-data/:id
// PUT /api/update-business-impact-analysis-data/:id
router.put("/update-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
    try {
        const {
            currentStatus,
            lastEditedBy,
            approvedBy,
            finalApprovedBy,
            formData,
            fieldName,   // if comment is being added
            newComment   // comment text
        } = req.body;

        const updateOps = { $set: {} };

        // ✅ update statuses
        if (currentStatus) updateOps.currentStatus = currentStatus;
        if (approvedBy) updateOps.approvedBy = approvedBy;
        if (finalApprovedBy) updateOps.finalApprovedBy = finalApprovedBy;

        // ✅ track last edit info
        if (lastEditedBy && lastEditedBy.email) {
            const now = new Date();
            updateOps.lastEditedBy = {
                email: lastEditedBy.email,
                date: now.toLocaleDateString("en-GB"),
                time: now.toLocaleTimeString()
            };
        }

        // ✅ update full formData values
        if (formData) {
            for (const [key, val] of Object.entries(formData)) {
                // Ensure value is always a string
                const actualValue = typeof val === "object" && val.value !== undefined ? val.value : val;
                // Initialize comments if not exists
                const comments = typeof val === "object" && Array.isArray(val.comments) ? val.comments : [];
                
                updateOps.$set[`formData.${key}`] = {
                    value: actualValue,
                    comments
                };
            }
        }

        // ✅ add a new comment to a specific field
        if (fieldName && newComment) {
            updateOps.$push = {
                [`formData.${fieldName}.comments`]: {
                    text: newComment,
                    author: req.user.userId,
                    date: new Date()
                }
            };
        }

        const updated = await BiaData.findByIdAndUpdate(
            req.params.id,
            updateOps,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Data not found" });
        }

        // 🔔 notifications (same as your old code)
        try {
            const updatedData = await BiaData.findById(req.params.id);
            const senderUser = await User.findById(req.user.userId);
            const creatorUser = await User.findOne({
                email: updatedData.createdBy,
                company: senderUser.company,
                department: senderUser.department,
                module: senderUser.module
            });

            if (creatorUser && senderUser) {
                let message = null;
                if (approvedBy) {
                    message = `Your BIA entry was approved by ${senderUser.name} (${senderUser.role}).`;
                } else if (finalApprovedBy) {
                    message = `Your BIA entry received final approval by ${senderUser.name} (${senderUser.role}).`;
                } else if (currentStatus?.toLowerCase().includes("reject")) {
                    message = `Your BIA entry was rejected by ${senderUser.name} (${senderUser.role}).`;
                }

                if (message) {
                    await Notification.create({
                        recipient: creatorUser._id,
                        sender: senderUser._id,
                        message,
                        forRole: creatorUser.role,
                        department: creatorUser.department,
                        company: creatorUser.company,
                        module: creatorUser.module
                    });
                }
            }
        } catch (notifErr) {
            console.error("Error sending notification for BIA update:", notifErr);
        }

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error("Update BIA error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});




// GET data for a user
router.get("/read-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, reason: "User not found" });
        }

        let data;

        if (user.role === "owner" || user.role === "admin" || user.role === "super admin") {
            data = await BiaData.find({
                company: user.company,
                department: user.department,
                module: user.module,
                // createdBy: { $ne: user.email }
            }).populate('userId', 'name email role department company');
        } else {
            data = await BiaData.find({ userId })
                .populate('userId', 'name email role department company');
        }

        res.status(200).json({ success: true, data });

    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


router.post("/add-comment/:id", verifyToken, async (req, res) => {
    const { fieldName, text } = req.body;  // fieldName like "risks" or "definition"
    try {
        const comment = { text, author: req.user.userId };
        const updated = await RiskAssessmentData.findByIdAndUpdate(
            req.params.id,
            { $push: { [`${fieldName}.comments`]: comment } },
            { new: true }
        );
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, reason: err.message });
    }
});


module.exports = router;


// READ BUSINESS IMPACT ANALYSIS DATA FOR A PARTICULAR USER
// router.get("/read-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
//     try {
//         const userId = req.params.id;

//         const data = await BiaData.find({
//             $or: [
//                 { userId },
//                 { company: req.user.company, department: req.user.department, module: req.user.module }
//             ]
//         });

//         res.status(200).json({ success: true, data });
//     } catch (error) {
//         console.error("Fetch error:", error);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// });

// // READ BUSINESS IMPACT ANALYSIS DATA CREATED BY LOGGED-IN USER
// router.get("/read-business-impact-analysis-data", verifyToken, async (req, res) => {
//   try {
//     const loggedInUserId = req.user._id || req.user.id; // based on your JWT token structure

//     const data = await BiaData.find({ userId: loggedInUserId });

//     res.status(200).json({ success: true, data });
//   } catch (error) {
//     console.error("Fetch error:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });



