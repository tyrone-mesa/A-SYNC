const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { execFileSync } = require("child_process");
const connectDB = require("./config/db");
const StudentProfile = require("./models/StudentProfile");
const { seedAdmin } = require("./utils/seedAdmin");
const { seedJobs } = require("./utils/seedJobs");
const mongoSanitize = require("./middleware/sanitize");
const {
  seedCompanyUploadedLogos,
} = require("./utils/seedCompanyUploadedLogos");
const {
  ensureMessageHistoryCollections,
  backfillMessageHistory,
} = require("./utils/messageHistory");
// Legacy external logo seeding is no longer run on startup — see note below.

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const companyRoutes = require("./routes/companyRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const staffRoutes = require("./routes/staffRoutes");
const contactRoutes = require("./routes/contactRoutes");
const registerHealthRoute = require("./utils/health");

const app = express();

const ensureStorageDirectories = () => {
  const directories = [
    path.join(__dirname, "uploads", "company-logos"),
    path.join(__dirname, "..", "client", "public", "company-logos"),
    path.join(__dirname, "..", "client", "public", "system-logo"),
  ];

  directories.forEach((directory) => {
    fs.mkdirSync(directory, { recursive: true });
  });
};

// Trust the first proxy hop so req.ip reports the real client address (needed
// behind Render / Railway / Heroku / Nginx).
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

// Default is now OFF. Most hosts (Render, Railway, Heroku, a plain VPS without extra setup)
// do not have the `clamscan` binary installed, and the old default of "true" meant every
// upload got hard-rejected with a 503 the moment CLAMAV_SCAN was left unset. Signature/
// magic-byte validation in scanUpload.js runs unconditionally regardless of this flag, so
// disabling ClamAV does not disable file-type validation — it only skips the extra
// antivirus binary scan, which you can turn on explicitly if your host provides ClamAV.
process.env.CLAMAV_SCAN = process.env.CLAMAV_SCAN ?? "false";
process.env.CLAMSCAN_PATH = process.env.CLAMSCAN_PATH || "clamscan";

const validateSecurityStartupConfig = () => {
  const isPlaceholder = (value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    return (
      !normalized ||
      /replace_with|your_|example\.com|changeme|change_me/.test(normalized)
    );
  };

  const jwtSecret = String(process.env.JWT_SECRET || "").trim();
  if (isPlaceholder(jwtSecret) || jwtSecret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET must be configured and at least 32 characters long before starting the server.",
      );
    } else {
      console.warn(
        "[ASIATECH SYNC] ⚠️  SECURITY WARNING: JWT_SECRET is unset, short, or placeholder. Use a 32+ character secret for production.",
      );
    }
  }

  if (isPlaceholder(process.env.MONGO_URI)) {
    throw new Error("MONGO_URI must be configured before starting the server.");
  }

  const adminPin = String(process.env.ADMIN_SENSITIVE_PIN || "").trim();
  const weakPins = ["123456", "111111", "000000", "2026", "admin", "password"];
  if (
    isPlaceholder(adminPin) ||
    adminPin.length < 6 ||
    weakPins.includes(adminPin.toLowerCase())
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_SENSITIVE_PIN must be set to a strong value with at least 6 characters and not a common default in production.",
      );
    } else {
      console.warn(
        "[ASIATECH SYNC] ⚠️  SECURITY WARNING: ADMIN_SENSITIVE_PIN is using a weak or default value. Set a strong 6+ character PIN in .env for production.",
      );
    }
  }

  const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  if (
    adminPassword &&
    (adminPassword.toLowerCase() === "adminsync00" || adminPassword.length < 8)
  ) {
    console.warn(
      "[ASIATECH SYNC] ⚠️  SECURITY WARNING: ADMIN_PASSWORD in .env is using a weak or default password ('Adminsync00'). Update it to a strong password.",
    );
  }
};

const checkClamAV = () => {
  if (process.env.CLAMAV_SCAN !== "true") {
    console.warn(
      "[ASIATECH SYNC] ClamAV scanning is disabled (set CLAMAV_SCAN=true if your host has ClamAV installed). Signature/type validation still runs on every upload.",
    );
    return;
  }

  try {
    execFileSync(process.env.CLAMSCAN_PATH, ["--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    console.log("[ASIATECH SYNC] ✓ ClamAV scanning enabled.");
  } catch {
    console.error(
      `[ASIATECH SYNC] ✗ ClamAV is enabled but was not found at "${process.env.CLAMSCAN_PATH}". File uploads will be rejected until ClamAV is installed or CLAMSCAN_PATH is corrected, or set CLAMAV_SCAN=false.`,
    );
  }
};

// Catches the most common "worked on my machine, broke in prod" causes: leftover localhost
// URLs (React bakes REACT_APP_API_URL in at build time, so this must be right *before* you
// build the client) and NODE_ENV still set to development. These are warnings, not hard
// stops, since some hosts intentionally proxy through localhost internally.
const checkProductionEnv = () => {
  if (process.env.NODE_ENV !== "production") return;

  const clientUrl = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL;
  if (
    !clientUrl ||
    /localhost|127\.0\.0\.1/.test(clientUrl)
  ) {
    console.warn(
      `[ASIATECH SYNC] ⚠️  NODE_ENV=production but CLIENT_URL is "${clientUrl || "(unset)"}". CORS will reject your real frontend until this points at its deployed URL.`,
    );
  }
  if (process.env.STORAGE_PROVIDER !== "cloudinary") {
    console.warn(
      "[ASIATECH SYNC] ⚠️  NODE_ENV=production with STORAGE_PROVIDER=local (or unset). Uploaded files will be lost on every redeploy/restart unless your host guarantees persistent disk. Set STORAGE_PROVIDER=cloudinary to fix this.",
    );
  }
};

// Global database connection state
let dbConnected = false;
let dbConnectionFailed = false;

const startDatabaseConnection = async () => {
  console.log("[ASIATECH SYNC] Attempting to connect to MongoDB...");
  try {
    await connectDB();
    dbConnected = true;

    try {
      const adminResult = await seedAdmin();
      console.log(
        `[ASIATECH SYNC] Admin: ${adminResult.created ? "created" : "updated"} ${adminResult.email}`,
      );
    } catch (err) {
      console.error("[ASIATECH SYNC] Admin seeding error:", err.message);
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const jobResult = await seedJobs();
        console.log(
          `[ASIATECH SYNC] Jobs: ${jobResult.created} created, ${jobResult.skipped} already existed`,
        );
      } catch (err) {
        console.error("[ASIATECH SYNC] Jobs seeding error:", err.message);
      }
    } else {
      console.log(
        "[ASIATECH SYNC] Sample jobs are not seeded in production.",
      );
    }

    // NOTE (Sep 2026): Legacy logo seeders used to auto-fill
    // logoUrl from https://logo.clearbit.com/<domain>. Clearbit's free Logo API
    // was permanently shut down on Dec 8, 2025, so every URL it generates 404s.
    // Running them on every boot was actively overwriting logoUrl with dead
    // links each time the server restarted. Disabled until they're repointed
    // at a working logo source. The app now falls back to a generated
    // initials avatar on the frontend instead (see client CompanyLogo.jsx),
    // so this is safe to leave off — real logos come from companyUploadedLogo.

    try {
      const uploadedLogoResult = await seedCompanyUploadedLogos();
      console.log(
        `[ASIATECH SYNC] Logos: ${uploadedLogoResult.verified} verified, ${uploadedLogoResult.cleaned} cleaned`,
      );
    } catch (err) {
      console.error(
        "[ASIATECH SYNC] ✗ Uploaded logos verification error:",
        err.message,
      );
    }

    try {
      await ensureMessageHistoryCollections();
      const archivedMessages = await backfillMessageHistory();
      console.log(
        `[ASIATECH SYNC] Message history: ${archivedMessages} messages checked`,
      );
    } catch (err) {
      console.error(
        "[ASIATECH SYNC] Message history initialization error:",
        err.message,
      );
    }
  } catch (error) {
    dbConnectionFailed = true;
    console.error("[ASIATECH SYNC] ✗ Database connection failed:");
    console.error("[ASIATECH SYNC] Error:", error.message);
    console.error("[ASIATECH SYNC]");
    console.error("[ASIATECH SYNC] Please check:");
    console.error("[ASIATECH SYNC]   1. MongoDB Atlas cluster is running");
    console.error(
      "[ASIATECH SYNC]   2. Your IP is whitelisted in MongoDB Atlas Network Access",
    );
    console.error("[ASIATECH SYNC]   3. MONGO_URI credentials are correct");
    console.error("[ASIATECH SYNC]   4. You have internet connectivity");
  }
};

const startServer = () => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[ASIATECH SYNC] Server running on port ${PORT}`);
    if (dbConnectionFailed) {
      console.log(
        "[ASIATECH SYNC] ⚠️  Database is NOT connected. Server running in limited mode.",
      );
    } else if (!dbConnected) {
      console.log(
        "[ASIATECH SYNC] Database connection pending; full functionality will be available after MongoDB connects.",
      );
    } else {
      console.log("[ASIATECH SYNC] ✓ Full functionality available!");
    }
  });
};

// Bind the HTTP API immediately so database startup failures return an API response
// instead of making the frontend report a browser-level Network Error.
console.log("[ASIATECH SYNC] Starting server...");
ensureStorageDirectories();
validateSecurityStartupConfig();
checkClamAV();
checkProductionEnv();
startServer();
startDatabaseConnection().catch(() => {
  console.log(
    "[ASIATECH SYNC] Continuing in limited mode while MongoDB is unavailable.",
  );
});

// Sets a standard set of protective HTTP response headers (CSP, HSTS,
// X-Content-Type-Options, X-Frame-Options, etc). CSP is left in report-only-friendly
// defaults here since the client is a separate React app served from its own origin;
// tighten directives further if the API ever serves HTML directly.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // In development the frontend may be opened from localhost, a LAN IP, or
      // a device hostname. Reflect the requesting origin instead of binding the
      // API to one developer machine's address. Production remains allowlisted.
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      const allowedOrigins = [
        process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL,
      ].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(mongoSanitize);
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// General API rate limit: protects every route from basic abuse/scraping/DoS.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Accounts for shared office/home IPs while still bounding API traffic. Auth
  // endpoints retain their separate, stricter 20-attempt limiter below.
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});
app.use("/api", apiLimiter);

// Stricter limit on auth endpoints specifically — these are the ones worth throttling
// hard against credential stuffing / brute force, in addition to the existing
// per-account lockout logic already implemented in authRoutes.js.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per IP per 15 minutes across login/register/reset endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});
app.use("/api/auth", authLimiter);

// Resume files are served by the protected student route below. Keep other uploaded
// assets (logos, certificates, and transcripts) available at their existing URLs.
app.use("/uploads", async (req, res, next) => {
  const fileUrl = `/uploads/${path.basename(req.path)}`;
  const isProtectedFile = await StudentProfile.exists({
    $or: [{ resumeUrl: fileUrl }, { avatarUrl: fileUrl }],
  });
  if (isProtectedFile)
    return res.status(404).json({ message: "File not found." });
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

registerHealthRoute(app);

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/contact", contactRoutes);

const clientBuildPath = path.join(__dirname, "..", "client", "build");
if (
  process.env.NODE_ENV === "production" &&
  fs.existsSync(path.join(clientBuildPath, "index.html"))
) {
  app.use(express.static(clientBuildPath));
  app.get("*", (req, res, next) => {
    if (
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      req.path.startsWith("/uploads/")
    ) {
      return next();
    }
    return res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({
        message: "The uploaded file is too large. Maximum size is 5 MB.",
      });
  }
  const showDetails = process.env.DEBUG_ERRORS === "true";
  res.status(err.status || 500).json({
    message: showDetails ? err.message : "Internal server error.",
  });
});
