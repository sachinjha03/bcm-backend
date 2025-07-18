const express = require('express');
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const JWT_SECRET = "DevelopedBySachinJha"

router.post("/create-user", async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    // Check if user already exists
    const isUserExist = await User.findOne({ email });
    if (isUserExist) {
      return res.status(400).json({ success: false, reason: "Email already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create new user
    const createUser = new User({
      name: req.body.name,
      email, // already lowercased
      password: hashedPassword,
      role: req.body.role,
      department: req.body.department,
      company: req.body.company,
      module: req.body.module
    });

    const response = await createUser.save();
    res.status(200).json({ success: true, data: response });

  } catch (err) {
    // Fallback for any unexpected errors
    res.status(400).json({ success: false, reason: err.message });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password, role, department , module , company } = req.body;
    const existingUser = await User.findOne({ email, role, department , module , company });
    if (!existingUser) {
      return res.status(404).json({ success: false, reason: "User not found" });
    }
    const comparePassword = await bcrypt.compare(password , existingUser.password )
    if (!comparePassword) {
      return res.status(401).json({ success: false, reason: "Invalid credentials" });
    }

    const payload = {
      userId: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      department: existingUser.department,
      company: existingUser.company,
      module: existingUser.module
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    res.status(200).json({
      success: true,
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, reason: "Server error during login" });
  }
});


module.exports = router;