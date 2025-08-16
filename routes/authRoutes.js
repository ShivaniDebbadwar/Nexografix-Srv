const express = require("express");
const router = express.Router();
const { loginUser, getAllUsersLastLogin} = require("../controllers/authController");

router.post("/login", loginUser);
router.get("/last-logins", getAllUsersLastLogin); // ✅ New route for admin

module.exports = router;
