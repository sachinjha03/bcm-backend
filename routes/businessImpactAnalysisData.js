const express = require('express');
const router = express.Router();
const BiaData = require('../models/BusinessImpactAnalysisData');
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ExcelJS = require("exceljs");
const archiver = require("archiver");
const transporter = require("../config/emailConfig");
const mongoose = require('mongoose');

// Schema to track champion submissions count per company and module for BIA
const BIAChampionSubmissionCounterSchema = new mongoose.Schema({
  company: { type: String, required: true },
  module: { type: String, required: true },
  biaSubmissionCount: { type: Number, default: 0 },
}, { unique: true, indexes: [{ key: { company: 1, module: 1 } }] });

const BIAChampionSubmissionCounter = mongoose.model('BIAChampionSubmissionCounter', BIAChampionSubmissionCounterSchema);

// Utility to generate a unique dataId
const generateDataId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let dataId = '';
    for (let i = 0; i < length; i++) {
        dataId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return dataId;
};

router.post('/add-business-impact-analysis-data', verifyToken, async (req, res) => {
    try {
        const {
            company,
            department,
            module,
            formData,
            createdBy,
            userId,
            currentStatus
        } = req.body;

        if (!company || !department || !module || !formData || !createdBy || !userId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const senderUser = await User.findById(req.user.userId);
        const isChampion = senderUser.role === 'champion';

        const newEntry = new BiaData({
            dataId: generateDataId(),
            company,
            department,
            module,
            formData,
            createdBy,
            userId,
            currentStatus: currentStatus || 'Pending for Owner Approval'
        });

        const saved = await newEntry.save();

        let championSubmissionsCount = 0;
        if (isChampion) {
            const counter = await BIAChampionSubmissionCounter.findOneAndUpdate(
                { company: senderUser.company, module: senderUser.module },
                { $set: { module: senderUser.module }, $inc: { biaSubmissionCount: 1 } },
                { upsert: true, new: true }
            );
            championSubmissionsCount = counter.biaSubmissionCount;
        }

        // Notifications + Emails
        try {
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

                // Send email to owners if champion and count reaches multiple of 10
                if (isChampion && championSubmissionsCount > 0 && championSubmissionsCount % 10 === 0) {
                    const owners = await User.find({
                        company: senderUser.company,
                        role: 'owner'
                    });

                    for (const owner of owners) {
                        if (owner.email) {
                            const mailOptions = {
                                from: process.env.EMAIL_USER,
                                to: owner.email,
                                subject: '🛡️ Milestone: 10 New BIA Submissions',
                                html: `
                                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                      <h2 style="color: #1976d2;">Milestone Reached: New BIA Submissions</h2>
                                      <p>Hello <strong>${owner.name}</strong>,</p>
                                      <p>A total of ${championSubmissionsCount} Business Impact Analysis submissions have been made by champions in your company for module ${senderUser.module}.</p>
                                      <p>The latest submission was made by <strong>${senderUser.name}</strong>.</p>
                                      <p>Visit our Business Continuity Management platform to review the details:</p>
                                      <p><a href="https://foulathbcm.com/" style="color: #1976d2; text-decoration: none;">https://foulathbcm.com/</a></p>
                                      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                        <tr>
                                          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message</strong></td>
                                          <td style="padding: 8px; border: 1px solid #ddd;">${championSubmissionsCount} BIA submissions by champions</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company</strong></td>
                                          <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.company}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department</strong></td>
                                          <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.department}</td>
                                        </tr>
                                        <tr>
                                          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Module</strong></td>
                                          <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.module}</td>
                                        </tr>
                                      </table>
                                      <hr style="margin: 20px 0;" />
                                      <p style="font-size: 0.9em; color: #555;">
                                        Regards,<br/>
                                        Your Risk Management System
                                      </p>
                                    </div>
                                `
                            };

                            transporter.sendMail(mailOptions, (error, info) => {
                                if (error) {
                                    console.error(`Failed to send email to ${owner.email}:`, error);
                                } else {
                                    console.log(`Email sent to ${owner.email}: ${info.response}`);
                                }
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error creating notifications and sending emails for BIA:", err);
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
        const id = req.params.id;
        const isDataExist = await BiaData.findById(id);
        if (!isDataExist) {
            return res.status(404).json({ success: false, reason: "Data Doesn't Exist" });
        }
        const response = await BiaData.findByIdAndDelete(id);
        res.status(200).json({ success: true, data: response });
    } catch (err) {
        res.status(400).json({ success: false, reason: err });
    }
});

// PUT /api/update-business-impact-analysis-data/:id
router.put("/update-business-impact-analysis-data/:id", verifyToken, async (req, res) => {
    try {
        const {
            currentStatus,
            lastEditedBy,
            approvedBy,
            finalApprovedBy,
            formData,
            fieldName,
            newComment
        } = req.body;

        const updateOps = { $set: {} };

        if (currentStatus) updateOps.currentStatus = currentStatus;
        if (approvedBy) updateOps.approvedBy = approvedBy;
        if (finalApprovedBy) updateOps.finalApprovedBy = finalApprovedBy;

        if (lastEditedBy && lastEditedBy.email) {
            const now = new Date();
            updateOps.lastEditedBy = {
                email: lastEditedBy.email,
                date: now.toLocaleDateString("en-GB"),
                time: now.toLocaleTimeString()
            };
        }

        if (formData) {
            for (const [key, val] of Object.entries(formData)) {
                const actualValue = typeof val === "object" && val.value !== undefined ? val.value : val;
                const comments = typeof val === "object" && Array.isArray(val.comments) ? val.comments : [];

                updateOps.$set[`formData.${key}`] = {
                    value: actualValue,
                    comments
                };
            }
        }

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

        // Notification & Email Logic
        try {
            const updatedData = await BiaData.findById(req.params.id);
            const senderUser = await User.findById(req.user.userId);

            // Find the creator (champion)
            const creatorUser = await User.findOne({
                email: updatedData.createdBy,
                company: senderUser.company,
                department: senderUser.department,
                module: senderUser.module
            });

            // Find all super admins
            const superAdmins = await User.find({
                company: senderUser.company,
                department: senderUser.department,
                module: senderUser.module,
                role: "super admin"
            });

            let message = null;
            if (approvedBy) {
                message = `Your BIA entry was approved by ${senderUser.name} (${senderUser.role}).`;
            } else if (currentStatus?.toLowerCase().includes("reject")) {
                message = `Your BIA entry was rejected by ${senderUser.name} (${senderUser.role}).`;
            }

            if (message && senderUser && creatorUser) {
                const recipients = [creatorUser, ...superAdmins];

                for (const recipient of recipients) {
                    // Save Notification in DB
                    await Notification.create({
                        recipient: recipient._id,
                        sender: senderUser._id,
                        message,
                        forRole: recipient.role,
                        department: senderUser.department,
                        company: senderUser.company,
                        module: senderUser.module
                    });

                    // Send Email Notification
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: recipient.email,
                        subject: '✅ BIA Data Status Update',
                        html: `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                              <h2 style="color: #1976d2;">Business Impact Analysis Update</h2>
                              <p>Hello <strong>${recipient.name}</strong>,</p>
                              <p>${message}</p>
                              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company</strong></td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.company}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department</strong></td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.department}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Module</strong></td>
                                  <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.module}</td>
                                </tr>
                              </table>
                              <hr style="margin: 20px 0;" />
                              <p style="font-size: 0.9em; color: #555;">
                                Regards,<br/>
                                Your Risk Management System
                              </p>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error(`Failed to send email to ${recipient.email}:`, error);
                        } else {
                            console.log(`Email sent to ${recipient.email}: ${info.response}`);
                        }
                    });
                }
            }
        } catch (notifErr) {
            console.error("Error sending notification or email:", notifErr);
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
    const { fieldName, text } = req.body;
    try {
        const comment = { text, author: req.user.userId, date: new Date() };
        const updated = await BiaData.findByIdAndUpdate(
            req.params.id,
            { $push: { [`formData.${fieldName}.comments`]: comment } },
            { new: true }
        );
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, reason: err.message });
    }
});

// format comments into readable text
const formatComments = (arr) =>
    (arr || [])
        .map(
            (c) =>
                `[${new Date(c.date).toLocaleDateString("en-GB")} ${new Date(
                    c.date
                ).toLocaleTimeString()}] ${c.text}`
        )
        .join("\n");

// DOWNLOAD BIA DATA AS ZIP
router.get("/download-bia/:year", verifyToken, async (req, res) => {
    try {
        const year = parseInt(req.params.year, 10);
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);

        // Get logged-in user
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Build query
        let query = { dateOfCreation: { $gte: start, $lt: end } };
        if (user.role === "champion") {
            query.userId = user._id;
        } else if (["owner", "admin", "super admin"].includes(user.role)) {
            query.company = user.company;
            query.department = user.department;
            query.module = user.module;
        }

        const data = await BiaData.find(query);
        if (!data.length) {
            return res.status(404).json({ message: "No data found for this year" });
        }

        // Collect all unique dynamic field names
        const allFields = new Set();
        data.forEach((rec) => {
            if (rec.formData) {
                if (rec.formData instanceof Map) {
                    rec.formData.forEach((_, key) => allFields.add(key));
                } else if (typeof rec.formData === "object") {
                    Object.keys(rec.formData).forEach((key) => allFields.add(key));
                }
            }
        });

        // Create workbook & sheet
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("BIA Data");

        // Fixed columns
        const columns = [
            { header: "S.No", key: "sno", width: 6 },
            { header: "Status", key: "status", width: 20 },
            { header: "Last Edit", key: "lastEdit", width: 35 },
            { header: "Created By", key: "createdBy", width: 25 },
        ];

        // Dynamic columns
        allFields.forEach((field) => {
            columns.push({
                header: field.replace(/_/g, " "),
                key: `${field}_value`,
                width: 30,
            });
            columns.push({
                header: `${field.replace(/_/g, " ")} Comments`,
                key: `${field}_comments`,
                width: 40,
            });
        });

        sheet.columns = columns;

        // Add rows
        data.forEach((rec, i) => {
            const rowObj = {
                sno: i + 1,
                status: rec.currentStatus,
                lastEdit: rec.lastEditedBy
                    ? `${rec.lastEditedBy.email}, ${rec.lastEditedBy.date}, ${rec.lastEditedBy.time}`
                    : "Not Edited Yet",
                createdBy: rec.createdBy,
            };

            if (rec.formData) {
                if (rec.formData instanceof Map) {
                    rec.formData.forEach((val, key) => {
                        if (val && typeof val === "object" && "value" in val) {
                            rowObj[`${key}_value`] = val.value || "";
                            rowObj[`${key}_comments`] = formatComments(val.comments);
                        } else {
                            rowObj[`${key}_value`] = val || "";
                            rowObj[`${key}_comments`] = "";
                        }
                    });
                } else if (typeof rec.formData === "object") {
                    Object.entries(rec.formData).forEach(([key, val]) => {
                        if (val && typeof val === "object" && "value" in val) {
                            rowObj[`${key}_value`] = val.value || "";
                            rowObj[`${key}_comments`] = formatComments(val.comments);
                        } else {
                            rowObj[`${key}_value`] = val || "";
                            rowObj[`${key}_comments`] = "";
                        }
                    });
                }
            }

            sheet.addRow(rowObj);
        });

        sheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: "top" };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=BIA_Data_${year}.zip`);

        const archive = archiver("zip");
        archive.pipe(res);
        archive.append(buffer, { name: `BIA_Data_${year}.xlsx` });
        await archive.finalize();
    } catch (err) {
        console.error("Download BIA error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;