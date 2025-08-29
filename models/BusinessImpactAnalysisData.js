const mongoose = require('mongoose');
const { Schema } = mongoose;

const fieldWithCommentsSchema = new Schema({
  value: { type: Schema.Types.Mixed }, // can be string, number, etc
  comments: [
    {
      text: String,
      author: { type: Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now }
    }
  ]
}, { _id: false });

const BiaDataSchema = new mongoose.Schema({
  dataId: String,
  formData: {
    type: Map,
    of: fieldWithCommentsSchema,
    required: true
  },
  createdBy: String,
  approvedBy: String,
  finalApprovedBy: String,
  lastEditedBy: { type: mongoose.Schema.Types.Mixed, default: null },
  dateOfCreation: { type: Date, default: Date.now },
  currentStatus: { type: String, default: 'Draft' },
  company: String,
  department: String,
  module: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});


const BiaDataModel = mongoose.model('BiaData', BiaDataSchema);

module.exports = BiaDataModel;