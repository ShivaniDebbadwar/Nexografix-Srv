
const bcrypt = require("bcrypt");
const User = require("../models/User");

const sendEmail = require("../utils/sendEmail");
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
      manager,
      dateofJoining: req.body.dateofJoining || null, // Optional field
      domain: req.body.domain || null, // Optional field
    });

    await newUser.save();
    const subject = "New User Created";
        const message = `
    Hello ${username},
    
    Your User Created in Portal.
    
    Regards,
    InfoTech Team
        `;
        await sendEmail(email, subject, message);
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createUser,
};
