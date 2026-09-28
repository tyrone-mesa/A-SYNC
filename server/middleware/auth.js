const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT and attaches the authenticated user to req.user
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive || user.isArchived) {
      return res
        .status(401)
        .json({ message: "Not authorized. Account not found or disabled." });
    }

    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Not authorized. Invalid or expired token." });
  }
};

// Allows public endpoints to use account identity when a valid token exists,
// while still accepting visitors who are not logged in.
const optionalProtect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

  try {
    const decoded = jwt.verify(
      authHeader.split(" ")[1],
      process.env.JWT_SECRET,
    );
    const user = await User.findById(decoded.id);
    if (user && user.isActive && !user.isArchived) req.user = user;
  } catch (error) {
    // Treat an expired public-session token as an anonymous visitor.
  }
  next();
};

// Restricts access to specific roles, e.g. authorize('admin', 'company')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden. Insufficient role permissions." });
    }
    next();
  };
};

module.exports = { protect, optionalProtect, authorize };
