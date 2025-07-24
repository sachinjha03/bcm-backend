const express = require("express")
const dotenv = require('dotenv')
dotenv.config()
require("./db/connection")
const cors = require('cors')
const PORT = process.env.port || 8000
const app = express();
app.use(express.json())
// app.use(cors())
app.use(cors({
  origin: ["http://localhost:3000", "https://foulath.vercel.app"],
  credentials: true,
}));

app.use("/api" , require("./routes/users"))
app.use("/api" , require("./routes/riskAssessmentData"))
app.use("/api" , require("./routes/businessImpactAnalysisData"))

app.listen(PORT , () => {
    console.log("Backend Started Successfully");
})