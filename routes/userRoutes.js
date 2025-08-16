
// routes/userRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware"); // must be logged in
const router = express.Router();

// Change password endpoint
router.post("/change-password", authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
console.log("req.user", req.user);
  if (!newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ message: "New password is required" });
  }

  console.log("User ID to update:", req.user.id);
  console.log("req.user", req.user);
  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { password: hashed, forceChangePassword: false },
      { new: true }
    );

    if (!updatedUser) {
      console.log("Updated user:", updatedUser);
      console.log("Updated user:", updatedUser);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Updated user:", req.user.id);
    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Error updating password", error: error.message || error.toString() });
  }
});


module.exports = router;
