const express = require("express");
const { getAllUsers } = require("../controllers/userController");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all users - Admin only
router.get("/", getAllUsers);

module.exports = router;
