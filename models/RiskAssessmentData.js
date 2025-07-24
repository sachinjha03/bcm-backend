const mongoose = require('mongoose')

const RiskAssessmentDataSchema = new mongoose.Schema({
  dataId: String,
  risks: String,
  definition: String,
  category: String,
  likelihood: Number,
  impact: Number,
  riskScore: Number,
  existingControl: String,
  control: Number,
  residualRisk: Number,
  mitigationPlan: String,
  riskOwner: String,
  createdBy: String,
  approvedBy: String,
  finalApprovedBy: String,
  lastEditedBy: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  dateOfCreation: {
    type: Date,
    default: Date.now
  },
  currentStatus: {
    type: String,
    default: "Draft"
  },
  company: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
})

const RiskAssessmentDataModel = mongoose.model("RiskAssessmentData", RiskAssessmentDataSchema)

module.exports = RiskAssessmentDataModel;



// lastEditedBy: {
//   type: String,
//   default: null
// },
// lastEditedBy: {
//   email: { type: String },
//   date: {
//     type: String,
//     default: () => {
//       const now = new Date();
//       const day = String(now.getDate()).padStart(2, '0');
//       const month = String(now.getMonth() + 1).padStart(2, '0');
//       const year = now.getFullYear();
//       return `${day}/${month}/${year}`;
//     }
//   },
//   time: {
//     type: String,
//     default: () => new Date().toLocaleTimeString()
//   }
// },