const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // ✅ Update last login date & time
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    if (user.forceChangePassword) {
      return res.status(200).json({
        message: "Login successful. Must change password.",
        token,
        forceChangePassword: true,
        lastLogin: user.lastLogin,
        username: user.username,
        role: user.role // Ensure this field exists in your User model
      });
    } else {
      return res.status(200).json({
        message: "Login successful.",
        token,
        role:user.role, // Make sure your user document has this field
        forceChangePassword: false,
        lastLogin: user.lastLogin,
         username: user.username,
         manager: user.manager,
         lastLogin: user.lastLogin // Include lastLogin in the response
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
// controllers/authController.js
const getAllUsersLastLogin = async (req, res) => {
  try {
    const users = await User.find({}, "username lastLogin role").sort({ lastLogin: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { loginUser, getAllUsersLastLogin };
