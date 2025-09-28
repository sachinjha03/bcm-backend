const mongoose = require("mongoose");
const { Schema } = mongoose;

const BIAHeaderCommentSchema = new Schema({
  fieldName: { type: String, required: true }, 
  comments: [
    {
      text: { type: String, required: true },
      author: { type: Schema.Types.ObjectId, ref: "User", required: true },
      date: { type: Date, default: Date.now }
    }
  ],
  company: { type: String, required: true },
  department: { type: String, required: true },
  module: { type: String, default: "BIA" }
});

const BIAHeaderComment = mongoose.model("BIAHeaderComment", BIAHeaderCommentSchema);
module.exports = BIAHeaderComment;
