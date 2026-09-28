// Run with: npm run seed:test-accounts
// Creates the local role-based test accounts without running during server startup.
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { STUDENT_EMAIL_DOMAIN } = require("../config/constants");
const CompanyProfile = require("../models/CompanyProfile");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { getPhilippineMonthString } = require("./philippineTime");

const TEST_PASSWORD = "12345678";
const TEST_STUDENT_OTP = "123456";
const testAccounts = [
  {
    fullName: "Test Student",
    email: `teststudent@${STUDENT_EMAIL_DOMAIN}`,
    role: "student",
  },
  {
    fullName: "Test Company",
    email: "testcompany@example.com",
    role: "company",
  },
  {
    fullName: "Test Coordinator",
    email: "testcoordinator@example.com",
    role: "coordinator",
  },
  {
    fullName: "Test Registrar",
    email: "testregistrar@example.com",
    role: "registrar",
  },
];

const ensureTestUser = async ({ fullName, email, role }) => {
  let user = await User.findOne({ email }).select(
    "+password +monthlyOtpHash +monthlyOtpMonth",
  );

  if (user && (user.role !== role || user.fullName !== fullName)) {
    throw new Error(
      `Refusing to change existing account ${email}; its name or role does not match the test account.`,
    );
  }

  if (!user) {
    user = new User({ fullName, email, password: TEST_PASSWORD, role });
  } else {
    user.password = TEST_PASSWORD;
  }

  user.isActive = true;
  user.isArchived = false;
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = undefined;

  if (role === "student") {
    user.monthlyOtpHash = crypto
      .createHash("sha256")
      .update(TEST_STUDENT_OTP)
      .digest("hex");
    user.monthlyOtpMonth = getPhilippineMonthString();
  }

  await user.save();
  return user;
};

const seedTestAccounts = async () => {
  const users = [];

  for (const account of testAccounts) {
    const user = await ensureTestUser(account);
    users.push(user);

    if (user.role === "student") {
      const profile = await StudentProfile.findOne({ user: user._id });
      if (!profile) {
        const studentId = "TEST-STUDENT";
        if (await StudentProfile.exists({ studentId })) {
          throw new Error(
            `Cannot create the test student profile; student ID ${studentId} is already in use.`,
          );
        }
        await StudentProfile.create({ user: user._id, studentId });
      }
    }

    if (user.role === "company") {
      let profile = await CompanyProfile.findOne({ user: user._id });
      if (!profile) {
        profile = new CompanyProfile({
          user: user._id,
          companyName: "A-Sync Test Company",
          contactPerson: user.fullName,
        });
      }
      profile.isVerified = true;
      await profile.save();
    }
  }

  return users.map(({ email, role, isActive }) => ({ email, role, isActive }));
};

if (require.main === module) {
  (async () => {
    if (!["development", "test"].includes(process.env.NODE_ENV)) {
      throw new Error(
        "Test accounts can only be seeded when NODE_ENV is explicitly set to development or test.",
      );
    }

    await connectDB();
    try {
      const users = await seedTestAccounts();
      console.log(
        "[ASIATECH SYNC] Development test accounts ready:",
        users,
      );
      console.log(
        `[ASIATECH SYNC] Student test OTP: ${TEST_STUDENT_OTP}`,
      );
    } finally {
      await mongoose.connection.close();
    }
  })().catch((error) => {
    console.error("[ASIATECH SYNC] Test account seed failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { seedTestAccounts };
