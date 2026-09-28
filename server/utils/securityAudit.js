const SecurityAuditLog = require("../models/SecurityAuditLog");

const recordAudit = (req, { action, outcome, user, email, role, details }) =>
  SecurityAuditLog.create({
    action,
    outcome,
    user: user?._id || user,
    email: email || user?.email,
    role: role || user?.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")?.slice(0, 500),
    details,
  }).catch((error) =>
    console.error("[SECURITY AUDIT] Failed to record event:", error.message),
  );

module.exports = { recordAudit };
