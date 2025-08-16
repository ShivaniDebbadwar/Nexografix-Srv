
const express = require("express");
const { authMiddleware, isAdmin  } = require("../middleware/authMiddleware");
const { createUser } = require("../controllers/userCreateController");

const router = express.Router();

router.post("/create", authMiddleware, isAdmin, createUser);

module.exports = router;
