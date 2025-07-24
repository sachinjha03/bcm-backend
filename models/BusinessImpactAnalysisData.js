const mongoose = require('mongoose');
const { Schema } = mongoose;

const BiaDataSchema = new Schema({
  dataId: String,

  // Store dynamic fields as a flexible object
  formData: {
    type: Map,
    of: Schema.Types.Mixed, // Can store strings, numbers, etc.
    required: true
  },

  // Approval workflow and audit
  createdBy: String,
  approvedBy: String,
  finalApprovedBy: String,
  lastEditedBy: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Meta
  dateOfCreation: {
    type: Date,
    default: Date.now
  },
  currentStatus: {
    type: String,
    default: 'Draft'
  },

  // Context (decoded from token)
  company: String,
  department: String,
  module: String,

  // Linking user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const BiaDataModel = mongoose.model('BiaData', BiaDataSchema);

module.exports = BiaDataModel;