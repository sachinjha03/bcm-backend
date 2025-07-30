const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("Database Connected Successfully");
}).catch((err) => {
    console.log("Failed During Database Connectivity : " , err);
    
})

module.exports = mongoose