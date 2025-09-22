const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const BIAHeaderComment = require("../models/BIAHeaderComment");

// ➡️ Add comment to a header
router.post("/header-comment", verifyToken, async (req, res) => {
  try {
    const { fieldName, text, company, department } = req.body;
    const userId = req.user.userId;

    if (!fieldName || !text || !company || !department) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let record = await BIAHeaderComment.findOne({ fieldName, company, department, module: "BIA" });

    if (!record) {
      record = new BIAHeaderComment({
        fieldName,
        company,
        department,
        module: "BIA",
        comments: [{ text, author: userId }]
      });
    } else {
      record.comments.push({ text, author: userId });
    }

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    console.error("Add header comment error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ➡️ Get all comments for headers
router.get("/header-comment", verifyToken, async (req, res) => {
  try {
    const { company, department } = req.query;
    const records = await BIAHeaderComment.find({ company, department, module: "BIA" })
      .populate("comments.author", "name email");

    res.json({ success: true, data: records });
  } catch (err) {
    console.error("Fetch header comments error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
