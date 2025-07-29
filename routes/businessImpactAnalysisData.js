const express = require('express');
const router = express.Router();
const BiaData = require('../models/BusinessImpactAnalysisData');
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');


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

        // Basic validation
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
            res.status(404).json({ success: false, reason: "Data Doesn't Exist" })
        }
        const response = await BiaData.findByIdAndDelete(id)
        res.status(200).json({ success: true, data: response })
    } catch (err) {
        res.status(400).json({ success: false, reason: err })
    }
})

// PUT /api/update-business-impact-analysis-data/:id
router.put("/update-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
    try {
        const { currentStatus, lastEditedBy, approvedBy, finalApprovedBy, formData } = req.body;

        const updateData = {
            currentStatus,
            lastEditedBy,
        };

        if (lastEditedBy && lastEditedBy.email) {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();

            updateData.lastEditedBy = {
                email: lastEditedBy.email,
                date: `${day}/${month}/${year}`,
                time: now.toLocaleTimeString()
            };
        }

        if (approvedBy) updateData.approvedBy = approvedBy;
        if (finalApprovedBy) updateData.finalApprovedBy = finalApprovedBy;
        if (formData) updateData.formData = formData; // ✅ include formData

        const updated = await BiaData.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error("Update BIA error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});


router.get("/read-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, reason: "User not found" });
    }

    let data;

    if (user.role === "owner" || user.role === "admin") {
      // Fetch data created by others with the same company, department, and module
      data = await BiaData.find({
        company: user.company,
        department: user.department,
        module: user.module,
        createdBy: { $ne: user.email } // Optional: exclude their own data
      }).populate('userId', 'name email role department company');
    } else {
      // Fetch only data created by the user
      data = await BiaData.find({ userId })
        .populate('userId', 'name email role department company');
    }

    res.status(200).json({ success: true, data });

  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


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



module.exports = router;
