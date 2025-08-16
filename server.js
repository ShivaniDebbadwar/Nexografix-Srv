const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const taskShownRoutes = require("./routes/taskshownRoutes");
const leaveRoutes = require("./routes/leaveRoute");
const timesheetRoutes = require("./routes/timesheetRoutes");
const desktopOnly = require("./middleware/desktopOnly");
const weekendRoutes = require("./routes/weekendRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
require("./cron/payrollCron"); // just importing registers the cron
const app = express();
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(desktopOnly); // Apply desktop-only middleware

// Connect DB
connectDB();

// Routes
// app.use("/api/users", require("./routes/userCreateRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/users", require("./routes/userCreateRoutes"));
app.use("/api/tasks", taskRoutes);
app.use("/api/tasksShown", taskShownRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/timesheedetails", require("./routes/timesheet"));
app.use("/api/weekend", weekendRoutes);
app.use("/api/userGet", require("./routes/userGetRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/payroll", payrollRoutes);
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
