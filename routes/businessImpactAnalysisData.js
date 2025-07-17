const express = require('express');
const router = express.Router();
const BiaData = require('../models/BusinessImpactAnalysisData');
const verifyToken = require('../middleware/verifyToken');

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


// READ BUSINESS IMPACT ANALYSIS DATA FOR A PARTICULAR USER
router.get("/read-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.params.id;

        const data = await BiaData.find({
            $or: [
                { userId },
                { company: req.user.company, department: req.user.department } // Optional role-based condition
            ]
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


module.exports = router;
