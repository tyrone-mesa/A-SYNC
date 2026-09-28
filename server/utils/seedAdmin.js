// Run with: npm run seed:admin
// Creates (or resets) the initial administrator account defined in .env
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const isWeakAdminPassword = (password) => {
  if (!password || password.length < 12) return true;
  const weakDefaults = [
    "adminsync00",
    "admin",
    "password",
    "123456",
    "changeme",
    "letmein",
    "qwerty",
  ];
  const normalized = String(password).toLowerCase();
  if (weakDefaults.includes(normalized)) return true;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return !(hasUpper && hasLower && hasNumber && hasSymbol);
};

const resetAdminPassword = async (password = process.env.ADMIN_PASSWORD) => {
  if (isWeakAdminPassword(password)) {
    throw new Error(
      "The replacement admin password is too weak. Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    );
  }

  const admin = await User.findOne({ role: "admin" }).select(
    "+password +failedLoginAttempts +loginLockedUntil",
  );
  if (!admin) {
    throw new Error(
      "No admin account exists. Run the regular admin seed first.",
    );
  }

  admin.password = password;
  admin.failedLoginAttempts = 0;
  admin.loginLockedUntil = undefined;
  await admin.save();
  return { email: admin.email };
};

const seedAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.",
    );
  }

  if (isWeakAdminPassword(ADMIN_PASSWORD)) {
    throw new Error(
      "ADMIN_PASSWORD is too weak. Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    );
  }

  // Treat "admin" as a singleton: this app only ever seeds one and has no self-registration
  // or "add admin" UI, so the right target to update is whichever admin document already
  // exists — not strictly the one matching ADMIN_EMAIL. That way, changing ADMIN_EMAIL and
  // ADMIN_PASSWORD in .env updates the existing admin in place instead of leaving the old one
  // behind and creating a second admin next to it. This keeps the admin credentials aligned
  // with the deployment configuration on every server start.
  let admin = await User.findOne({ role: "admin" }).select(
    "+password +failedLoginAttempts +loginLockedUntil",
  );

  if (admin) {
    const emailChanged =
      admin.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase();
    admin.email = ADMIN_EMAIL;
    admin.fullName = ADMIN_NAME || admin.fullName;
    admin.password = ADMIN_PASSWORD;
    admin.failedLoginAttempts = 0;
    admin.loginLockedUntil = undefined;
    await admin.save();
    return {
      created: false,
      email: admin.email,
      message: emailChanged
        ? `Admin renamed to ${admin.email} and password reset from .env.`
        : `Admin already exists: ${admin.email} and password reset from .env.`,
    };
  }

  admin = await User.create({
    fullName: ADMIN_NAME || "Platform Administrator",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
  });

  return {
    created: true,
    email: admin.email,
    message: `Admin account created: ${admin.email}`,
  };
};

if (require.main === module) {
  (async () => {
    await connectDB();

    if (process.argv.includes("--reset-password")) {
      const result = await resetAdminPassword();
      console.log(`Admin password reset successfully for ${result.email}.`);
    } else {
      const result = await seedAdmin();
      console.log(result.message);
    }

    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error("Admin seed failed:", err.message);
    process.exit(1);
  });
}

module.exports = { isWeakAdminPassword, resetAdminPassword, seedAdmin };
