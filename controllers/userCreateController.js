
const bcrypt = require("bcrypt");
const User = require("../models/User");

const createUser = async (req, res) => {
  const { username, email, password, role, totalEarning, manager } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      forceChangePassword: true,
      totalEarning,
      manager
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createUser,
};
