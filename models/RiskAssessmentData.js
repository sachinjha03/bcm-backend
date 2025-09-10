const mongoose = require('mongoose');

// Reusable schema for fields with comments
const fieldWithCommentsSchema = new mongoose.Schema({
  value: mongoose.Schema.Types.Mixed,
  comments: [
    {
      text: String,
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now }
    }
  ]
}, { _id: false });

const RiskAssessmentDataSchema = new mongoose.Schema({
  dataId: String,
  risks: fieldWithCommentsSchema,
  definition: fieldWithCommentsSchema,
  category: fieldWithCommentsSchema,
  likelihood: fieldWithCommentsSchema,
  impact: fieldWithCommentsSchema,
  riskScore: fieldWithCommentsSchema,
  existingControl: fieldWithCommentsSchema,
  controlEffectiveness: fieldWithCommentsSchema,
  control: fieldWithCommentsSchema,
  residualRisk: fieldWithCommentsSchema,
  treatmentOption: fieldWithCommentsSchema,
  mitigationPlan: fieldWithCommentsSchema,
  riskOwner: fieldWithCommentsSchema,
  createdBy: String,
  approvedBy: String,
  finalApprovedBy: String,
  lastEditedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

  dateOfCreation: { type: Date, default: Date.now },
  currentStatus: { type: String, default: "Draft" },
  company: String,

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const RiskAssessmentData = mongoose.model("RiskAssessmentData", RiskAssessmentDataSchema);
module.exports = RiskAssessmentData;




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