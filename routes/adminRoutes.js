
// routes/adminRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const router = express.Router();

// Add new user (admin or employee)
router.post("/add-user", async (req, res) => {
  const { username, email, password, role, manager } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      manager,
      // Force password change on first login
      forceChangePassword: true
    });

    await newUser.save();

    res.status(201).json({ message: "User created. Must change password on first login." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
