
const bcrypt = require("bcrypt");
const User = require("../models/User");

const sendEmail = require("../utils/sendEmail");
const createUser = async (req, res) => {
  const { username, email, password, role, totalEarning, manager } = req.body;

  try {
    const withOutBycriptPass = req.body.password;
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
    const subject = "Your Login Credentials for Nexografix HRIS";
        const message = `
    Dear ${username},
    
    You have been successfully registered in the Nexografix HRIS system. This platform allows you to manage your attendance (login/logout time), payroll details, and other work records.
    
    Below are your login credentials:

    User ID: ${username}

    Temporary Password: ${withOutBycriptPass}

    Important: You must change your password upon your first login. This will be a one-time requirement to secure your account.

    Login here: [https://nexografix.netlify.app]

   If you experience any technical issues, please reach out at [info@nexografix.com].


    
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
