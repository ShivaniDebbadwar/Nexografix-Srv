// utils/resolveManagerName.js
const User = require("../models/User");

async function resolveManagerName(employee) {
  if (!employee?.manager) return null;

  // If manager is stored as a plain string (name/username), just return it
  if (typeof employee.manager === "string") return employee.manager;

  // Otherwise assume it's an ObjectId → fetch manager user
  try {
    const mgr = await User.findById(employee.manager).select("fullName username name email");
    return (
      mgr?.fullName ||
      mgr?.username ||
      mgr?.name ||
      mgr?.email ||
      String(employee.manager)
    );
  } catch {
    return String(employee.manager);
  }
}

module.exports = { resolveManagerName };
