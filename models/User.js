const mongoose = require("mongoose")

const UserScheme = new mongoose.Schema({
    // userId:String,
    name: String,
    email: {
        type: String,
        unique: true, // this creates a unique index
        required: true,
    },
    password: String,
    role: String,  // CHAMPTION , OWNER , ADMIN
    department: String, // RA , BIA
    company: String,   // FOULATH , SULB , BAHREEN STEEL , SAUDI SULB
    module: {
        type: String,
        default: ""
    }  // HR , ID , SALES & MARKETING ETC
})

const User = new mongoose.model("User", UserScheme)

module.exports = User;