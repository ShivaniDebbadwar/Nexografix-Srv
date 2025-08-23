const express = require("express");
const router = express.Router();
const ShiftRequest = require("../models/ShiftRequest");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");
const sendEmail = require("../utils/sendEmail"); // ✅ Make sure this exists
const User = require("../models/User");
const Notification = require("../models/Notification");
// Employee: Submit shift working request
router.post("/apply", authMiddleware, async (req, res) => {
  try {
    console.log("User Info:", req.user); // Debugging line
    console.log("Request Body:", req.body); // Debugging line
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
        console.log("Missing fields in request body"); // Debugging line
      return res.status(400).json({ message: "All fields are required" });
    }

    const shiftReq = new ShiftRequest({
      employeeId: req.user.id,
      startDate,
      endDate,
      reason,
    });
    console.log("Shift Request Object:", shiftReq); // Debugging line
   const employee = await User.findById(req.user.id).select("username email manager");

    console.log("Shift Request Created:", shiftReq);
    console.log("Employee Name:", employee?.username, "Email:", employee?.email);

    await shiftReq.save();
     // Notify all admins
        const adminUsers = await User.find({ role: "admin" });
        for (const admin of adminUsers) {
          await Notification.create({
            user: admin._id,
            recipientRole: admin.role, // required field
            message: `Employee ${employee?.username} New Shift Request Submitted`,
          });
          await sendEmail(
            admin.email,
        `<p>Hello ${admin.username},</p>
         <p><b>${employee?.username}</b> has applied for a shift:</p>
         <ul>
           <li><b>From:</b> ${startDate}</li>
           <li><b>To:</b> ${endDate}</li>
           <li><b>Reason:</b> ${reason}</li>
         </ul>
         <p>Please login to the portal to review.</p>`
          );
        }

    res.status(201).json({ message: "Shift request submitted", shiftReq });
  } catch (err) {
    res.status(500).json({ message: "Error creating shift request", error: err.message });
  }
});

// Employee: Get own shift requests
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const requests = await ShiftRequest.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching shift requests", error: err.message });
  }
});

// Admin: Get all shift requests
router.get("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const requests = await ShiftRequest.find()
      .populate("employeeId", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching shift requests", error: err.message });
  }
});

// Admin: Approve / Reject a request
router.put("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { status, managerRemark } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await ShiftRequest.findByIdAndUpdate(
      req.params.id,
      { status, managerRemark },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Shift request not found" });
    }
   const employee = await User.findById(req.user.id).select("username email manager");
    request.populate("employeeId", "username email").execPopulate();
    // 🔔 Notify Employee
    sendEmail(
      request.employeeId.email,
      `Your Shift Request has been ${status}`,
      `<p>Hello ${employee?.username},</p>
       <p>Your shift request from <b>${request.startDate.toDateString()}</b> 
       to <b>${request.endDate.toDateString()}</b> has been 
       <b>${status}</b> by the manager.</p>
       <p>Remark: ${managerRemark || "No remarks provided"}</p>`
    );

    res.json({ message: `Request ${status}`, request });
  } catch (err) {
    res.status(500).json({ message: "Error updating request", error: err.message });
  }
});

module.exports = router;
