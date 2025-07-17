const express = require('express');
const router = express.Router();
const RiskAssessmentData = require('../models/RiskAssessmentData');
const User = require('../models/User'); 
const verifyToken = require("../middleware/verifyToken")



// Utility to generate a unique dataId
const generateDataId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let dataId = '';
  for (let i = 0; i < length; i++) {
    dataId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return dataId;
};

// POST: Add new risk assessment data
router.post('/add-risk-assessment-data',verifyToken ,  async (req, res) => {
  const {
    risks,
    definition,
    category,
    likelihood,
    impact,
    riskScore,
    existingControl,
    control,
    residualRisk,
    mitigationPlan,
    riskOwner,
    createdBy,
    approvedBy,
    finalApprovedBy,
    currentStatus,
    company,
    userId, // ✅ must be ObjectId (sent from frontend)
  } = req.body;

  try {
    const newData = new RiskAssessmentData({
      dataId: generateDataId(),
      risks,
      definition,
      category,
      likelihood,
      impact,
      riskScore,
      existingControl,
      control,
      residualRisk,
      mitigationPlan,
      riskOwner,
      createdBy,
      approvedBy,
      finalApprovedBy,
      currentStatus,
      company,
      userId,
    });

    const response = await newData.save();
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('Error saving risk data:', err);
    res.status(400).json({ success: false, reason: err.message || err });
  }
});

// GET: Read all risk assessment data
router.get('/read-all-risk-assessment-data' , verifyToken , async (req, res) => {
  try {
    const response = await RiskAssessmentData.find().populate('userId', 'name email role department company');
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('Error reading risk data:', err);
    res.status(400).json({ success: false, reason: err.message || err });
  }
});


// GET: Read risk data by user ID
router.get('/read-risk-assessment-data/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, reason: "User not found" });

    let response;

    if (user.role === "owner" || user.role === "admin") {
      // Fetch all records with same company and department
      response = await RiskAssessmentData.find({
        company: user.company,
        createdBy: { $ne: user.email }, // Optional: exclude their own data
      }).populate('userId', 'name email role department company');
    } else {
      // Fetch only their own records
      response = await RiskAssessmentData.find({ userId })
        .populate('userId', 'name email role department company');
    }

    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error('Error fetching risk data:', err);
    res.status(400).json({ success: false, reason: err.message });
  }
});




// DELETE: DELETE RISK DATA
router.delete('/delete-risk-assessment-data/:id' , verifyToken, async (req, res) => {
  const id = req.params.id;
  try {
    const isDataExist = await RiskAssessmentData.findById(id); // await this
    if (!isDataExist) {
      return res.status(404).json({ success: false, reason: "Data doesn't exist" });
    }

    const response = await RiskAssessmentData.findByIdAndDelete(id);
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(400).json({ success: false, reason: "Failed To Delete Data" });
  }
});

// Update Risk Assessment Data
router.put("/update-risk-assessment-data/:id", verifyToken, async (req, res) => {
  try {
    const {risks,definition,category,likelihood,impact,riskScore,existingControl,control,residualRisk,mitigationPlan,riskOwner,currentStatus,lastEditedBy,approvedBy,finalApprovedBy} = req.body;

    const updateData = {
      risks,definition,category,likelihood,impact,riskScore,existingControl,control,residualRisk,mitigationPlan,riskOwner,currentStatus,lastEditedBy,};

    if (approvedBy) updateData.approvedBy = approvedBy;
    if (finalApprovedBy) updateData.finalApprovedBy = finalApprovedBy;

    const updated = await RiskAssessmentData.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});




module.exports = router;
