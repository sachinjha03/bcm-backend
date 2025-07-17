const mongoose = require('mongoose')

const RiskAssessmentDataSchema = new mongoose.Schema({
    dataId:String,
    risks:String,
    definition:String,
    category:String,
    likelihood:Number,
    impact:Number,
    riskScore:Number,
    existingControl:String,
    control:Number,
    residualRisk:Number,
    mitigationPlan:String,
    riskOwner:String,
    createdBy:String,
    approvedBy:String,
    finalApprovedBy:String,
    lastEditedBy: {
      type: String,
      default: null
    },
    dateOfCreation:{
        type:Date,
        default:Date.now
    },
    currentStatus:{
      type:String , 
      default : "Draft"},
    company:String,
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
})

const RiskAssessmentDataModel = mongoose.model("RiskAssessmentData" , RiskAssessmentDataSchema)

module.exports = RiskAssessmentDataModel;