const express = require('express');
const router = express.Router();
const transporter = require("../config/emailConfig")
const RiskAssessmentData = require('../models/RiskAssessmentData');
const User = require('../models/User');
const verifyToken = require("../middleware/verifyToken")
const Notification = require('../models/Notification');

const ExcelJS = require("exceljs");
const archiver = require("archiver");



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


router.post('/add-risk-assessment-data', verifyToken, async (req, res) => {
  const {
    risks,
    definition,
    category,
    likelihood,
    impact,
    riskScore,
    existingControl,
    controlEffectiveness,
    control,
    residualRisk,
    treatmentOption,
    mitigationPlan,
    riskOwner,
    createdBy,
    approvedBy,
    finalApprovedBy,
    currentStatus,
    company,
    userId,
  } = req.body;

  try {
    const newData = new RiskAssessmentData({
      dataId: generateDataId(),
      risks: { value: risks, comments: [] },
      definition: { value: definition, comments: [] },
      category: { value: category, comments: [] },
      likelihood: { value: likelihood, comments: [] },
      impact: { value: impact, comments: [] },
      riskScore: { value: riskScore, comments: [] },
      existingControl: { value: existingControl, comments: [] },
      controlEffectiveness: { value: controlEffectiveness, comments: [] },
      control: { value: control, comments: [] },
      residualRisk: { value: residualRisk, comments: [] },
      treatmentOption: { value: treatmentOption, comments: [] },
      mitigationPlan: { value: mitigationPlan, comments: [] },
      riskOwner: { value: riskOwner, comments: [] },
      createdBy,
      approvedBy,
      finalApprovedBy,
      currentStatus,
      company,
      userId
    });

    const response = await newData.save();

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
          message: `New risk data submitted by ${senderUser.name}.`,
          forRole: user.role,
          department: user.department,
          company: user.company,
          module: user.module
        }));

        await Notification.insertMany(notifications);

        // ✅ Send Email Notifications
        // for (const user of relatedUsers) {
        //   if (user.email) {
        //     const mailOptions = {
        //       from: process.env.EMAIL_USER,
        //       to: user.email,
        //       subject: '🛡️ New Risk Assessment Data Submitted',
        //       html: `
        //       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        //         <h2 style="color: #1976d2;">New Risk Assessment Data Submitted</h2>
        //         <p>Hello <strong>${user.name}</strong>,</p>

        //         <p>A new risk assessment has been submitted by <strong>${senderUser.name}</strong>.</p>

        //         <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        //           <tr>
        //             <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message</strong></td>
        //             <td style="padding: 8px; border: 1px solid #ddd;">New risk data submitted by ${senderUser.name}</td>
        //           </tr>
        //           <tr>
        //             <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company</strong></td>
        //             <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.company}</td>
        //           </tr>
        //           <tr>
        //             <td style="padding: 8px; border: 1px solid #ddd;"><strong>Department</strong></td>
        //             <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.department}</td>
        //           </tr>
        //           <tr>
        //             <td style="padding: 8px; border: 1px solid #ddd;"><strong>Module</strong></td>
        //             <td style="padding: 8px; border: 1px solid #ddd;">${senderUser.module}</td>
        //           </tr>
        //         </table>

        //         <hr style="margin: 20px 0;" />

        //         <p style="font-size: 0.9em; color: #555;">
        //           Regards,<br/>
        //           Your Risk Management System
        //         </p>
        //       </div>
        //        `
        //     };


        //     transporter.sendMail(mailOptions, (error, info) => {
        //       if (error) {
        //         console.error(`Failed to send email to ${user.email}:`, error);
        //       } else {
        //         console.log(`Email sent to ${user.email}: ${info.response}`);
        //       }
        //     });
        //   }
        // }
      }
    } catch (err) {
      console.error("Error creating notifications and sending emails:", err);
    }

    res.status(200).json({ success: true, data: response });

  } catch (err) {
    console.error('Error saving risk data:', err);
    res.status(400).json({ success: false, reason: err.message || err });
  }
});



// GET: Read all risk assessment data
router.get('/read-all-risk-assessment-data', verifyToken, async (req, res) => {
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

    if (user.role === "owner" || user.role === "admin" || user.role === "super admin") {
      // Fetch all records with same company and department
      response = await RiskAssessmentData.find({
        company: user.company,
        // createdBy: { $ne: user.email }, 
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
router.delete('/delete-risk-assessment-data/:id', verifyToken, async (req, res) => {
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


router.put("/update-risk-assessment-data/:id", verifyToken, async (req, res) => {
  try {
    const {
      risks,
      definition,
      category,
      likelihood,
      impact,
      riskScore,
      existingControl,
      controlEffectiveness,
      control,
      residualRisk,
      treatmentOption,
      mitigationPlan,
      riskOwner,
      currentStatus,
      lastEditedBy,
      approvedBy,
      finalApprovedBy,
      fieldName,
      newComment
    } = req.body;

    const userRole = req.user.role;

    const isEditingData =
      risks !== undefined || definition !== undefined || category !== undefined ||
      likelihood !== undefined || impact !== undefined || riskScore !== undefined ||
      existingControl !== undefined || control !== undefined || residualRisk !== undefined ||
      mitigationPlan !== undefined || riskOwner !== undefined;

    const updateData = {};

    if (risks !== undefined) updateData["risks.value"] = risks;
    if (definition !== undefined) updateData["definition.value"] = definition;
    if (category !== undefined) updateData["category.value"] = category;
    if (likelihood !== undefined) updateData["likelihood.value"] = likelihood;
    if (impact !== undefined) updateData["impact.value"] = impact;
    if (riskScore !== undefined) updateData["riskScore.value"] = riskScore;
    if (existingControl !== undefined) updateData["existingControl.value"] = existingControl;
    if (controlEffectiveness !== undefined) updateData["controlEffectiveness.value"] = controlEffectiveness;
    if (control !== undefined) updateData["control.value"] = control;
    if (residualRisk !== undefined) updateData["residualRisk.value"] = residualRisk;
    if (treatmentOption !== undefined) updateData["treatmentOption.value"] = treatmentOption;
    if (mitigationPlan !== undefined) updateData["mitigationPlan.value"] = mitigationPlan;
    if (riskOwner !== undefined) updateData["riskOwner.value"] = riskOwner;

    if (currentStatus) updateData.currentStatus = currentStatus;
    if (approvedBy) updateData.approvedBy = approvedBy;
    if (finalApprovedBy) updateData.finalApprovedBy = finalApprovedBy;

    if ((userRole === "champion" || userRole === "owner" || userRole === "super admin") && isEditingData && lastEditedBy) {
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

    const updateOps = { $set: updateData };

    if (fieldName && newComment) {
      updateOps.$push = {
        [`${fieldName}.comments`]: {
          text: newComment,
          author: req.user.userId,
          date: new Date()
        }
      };
    }

    const updated = await RiskAssessmentData.findByIdAndUpdate(
      req.params.id,
      updateOps,
      { new: true }
    );

    // 🔔 Notification & Email Logic (Only on Owner Approve/Reject)
    // 🔔 Notification & Email Logic (Only on Owner Approve/Reject)
try {
  const updatedData = await RiskAssessmentData.findById(req.params.id);
  const senderUser = await User.findById(req.user.userId);

  // Find the Champion
  const championUser = await User.findOne({
    email: updatedData.createdBy,
    company: senderUser.company,
    department: senderUser.department,
    module: senderUser.module,
    role: "champion"
  });

  // Find all Super Admins
  const superAdmins = await User.find({
    company: senderUser.company,
    department: senderUser.department,
    module: senderUser.module,
    role: "super admin"
  });

  let message = null;
  if (approvedBy) {
    message = `Your risk "${updatedData.risks?.value}" was approved by ${senderUser.name} (${senderUser.role}).`;
  } else if (currentStatus?.toLowerCase().includes("reject")) {
    message = `Your risk "${updatedData.risks?.value}" was rejected by ${senderUser.name} (${senderUser.role}).`;
  }

  if (message && senderUser && championUser) {
    const recipients = [championUser, ...superAdmins];

    for (const recipient of recipients) {
      // Create Notification
      const notification = new Notification({
        recipient: recipient._id,
        sender: senderUser._id,
        message,
        forRole: recipient.role,
        department: senderUser.department,
        company: senderUser.company,
        module: senderUser.module
      });

      await notification.save();

      // Send Email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject: '✅ Risk Assessment Data Status Update',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #1976d2;">Risk Assessment Data Update</h2>
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
  console.error("Error sending approval/rejection notifications/emails:", notifErr);
}


    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
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


// DOWNLOAD DATA (RA)
// -------------------

// GET /api/download-risk-assessment/:year
router.get("/download-risk-assessment/:year", verifyToken, async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (!Number.isInteger(year)) {
      return res.status(400).json({ message: "Invalid year" });
    }

    // Use UTC bounds to avoid timezone off-by-one
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const user = await User.findById(req.user.userId).lean();

    // Base query: by creation date
    const query = { dateOfCreation: { $gte: start, $lt: end } };


    // Role-based scoping
    if (user.role === "champion") {
      query.userId = user._id;
    } else if (["owner", "admin", "super admin"].includes(user.role)) {
      query.company = user.company;
    }


    const data = await RiskAssessmentData.find(query).lean();


    if (!data.length) {
      return res.status(404).json({ message: "No data found for this year" });
    }

    // Build Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Risk Assessment Data");

    sheet.columns = [
      { header: "S.No", key: "sno", width: 6 },
      { header: "Risks", key: "risks", width: 30 },
      { header: "Risks Comments", key: "risksComments", width: 50 },
      { header: "Definition", key: "definition", width: 30 },
      { header: "Definition Comments", key: "definitionComments", width: 50 },
      { header: "Category", key: "category", width: 15 },
      { header: "Likelihood", key: "likelihood", width: 12 },
      { header: "Impact", key: "impact", width: 12 },
      { header: "Risk Score", key: "riskScore", width: 12 },
      { header: "Existing Control", key: "existingControl", width: 25 },
      { header: "Existing Control Comments", key: "existingControlComments", width: 50 },
      { header: "Control Effectiveness", key: "controlEffectiveness", width: 25 },
      { header: "Control Effectiveness Comments", key: "controlEffectivenessComments", width: 50 },
      { header: "Mitigation Plan", key: "mitigationPlan", width: 25 },
      { header: "Mitigation Plan Comments", key: "mitigationPlanComments", width: 50 },
      { header: "Risk Owner", key: "riskOwner", width: 20 },
      { header: "Risk Owner Comments", key: "riskOwnerComments", width: 50 },
      { header: "Status", key: "status", width: 20 },
      { header: "Last Edit", key: "lastEdit", width: 35 },
      { header: "Created By", key: "createdBy", width: 30 },
      { header: "Created At", key: "createdAt", width: 24 },
    ];

    const formatCommentDate = (c) => {
      // c.date may be Date, ISO string, or already "dd/mm/yy hh:mm:ss"
      let dateStr = "";
      if (c?.date instanceof Date) {
        dateStr =
          c.date.toLocaleDateString("en-GB") + " " + c.date.toLocaleTimeString();
      } else if (typeof c?.date === "string") {
        const d = new Date(c.date);
        dateStr = isNaN(d)
          ? c.date // fallback to stored string
          : d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString();
      }
      // If explicit time exists, include it (avoid duplicating)
      if (c?.time && typeof c.time === "string" && !dateStr.includes(c.time)) {
        dateStr = `${dateStr ? dateStr + " " : ""}${c.time}`;
      }
      return dateStr || "";
    };

    const formatComments = (arr) =>
      Array.isArray(arr) && arr.length
        ? arr
          .map((c) => {
            const ts = formatCommentDate(c);
            return ts ? `[${ts}] ${c.text || ""}` : `${c.text || ""}`;
          })
          .join("\n")
        : "";

    data.forEach((rec, i) => {
      const row = sheet.addRow({
        sno: i + 1,
        risks: rec.risks?.value || "",
        risksComments: formatComments(rec.risks?.comments),
        definition: rec.definition?.value || "",
        definitionComments: formatComments(rec.definition?.comments),
        category: rec.category?.value || "",
        likelihood: rec.likelihood?.value ?? "",
        impact: rec.impact?.value ?? "",
        riskScore: rec.riskScore?.value ?? "",
        existingControl: rec.existingControl?.value || "",
        existingControlComments: formatComments(rec.existingControl?.comments),
        controlEffectiveness: rec.controlEffectiveness?.value || "",
        controlEffectivenessComments: formatComments(rec.controlEffectiveness?.comments),
        mitigationPlan: rec.mitigationPlan?.value || "",
        mitigationPlanComments: formatComments(rec.mitigationPlan?.comments),
        riskOwner: rec.riskOwner?.value || "",
        riskOwnerComments: formatComments(rec.riskOwner?.comments),
        status: rec.currentStatus || "",
        lastEdit: rec.lastEditedBy
          ? `${rec.lastEditedBy.email || ""}${rec.lastEditedBy.date ? ", " + rec.lastEditedBy.date : ""
          }${rec.lastEditedBy.time ? ", " + rec.lastEditedBy.time : ""}`
          : "Not Edited Yet",
        createdBy: rec.createdBy || "",
        createdAt:
          rec.dateOfCreation instanceof Date
            ? rec.dateOfCreation.toLocaleString()
            : rec.dateOfCreation || "",
      });

      // Wrap text so long comments auto-expand row height
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    // Zip and stream to client
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=RA_Data_${year}.zip`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("Zip error:", err);
      // Important: only send if headers not sent
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate zip" });
      }
    });

    archive.pipe(res);
    archive.append(buffer, { name: `RA_Data_${year}.xlsx` });
    await archive.finalize();
  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
});





module.exports = router;









// Update Risk Assessment Data
// router.put("/update-risk-assessment-data/:id", verifyToken, async (req, res) => {
//   try {
//     const {risks,definition,category,likelihood,impact,riskScore,existingControl,control,residualRisk,mitigationPlan,riskOwner,currentStatus,lastEditedBy,approvedBy,finalApprovedBy} = req.body;

//     const updateData = {
//       risks,definition,category,likelihood,impact,riskScore,existingControl,control,residualRisk,mitigationPlan,riskOwner,currentStatus,lastEditedBy,};

//     if (approvedBy) updateData.approvedBy = approvedBy;
//     if (finalApprovedBy) updateData.finalApprovedBy = finalApprovedBy;

//     const updated = await RiskAssessmentData.findByIdAndUpdate(
//       req.params.id,
//       { $set: updateData },
//       { new: true }
//     );

//     res.json({ success: true, data: updated });
//   } catch (err) {
//     console.error("Update error:", err);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// });




