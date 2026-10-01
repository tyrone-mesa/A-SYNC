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

// Routes
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

// Create Express app ONCE
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

/*
|--------------------------------------------------------------------------
| Security / Helmet
|--------------------------------------------------------------------------
*/
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// Trust the first proxy hop so req.ip reports the real client address
// behind Railway / Render / Heroku / Nginx.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/*
|--------------------------------------------------------------------------
| ClamAV configuration
|--------------------------------------------------------------------------
*/

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
        "JWT_SECRET must be configured and at least 32 characters long before starting the server."
      );
    } else {
      console.warn(
        "[ASIATECH SYNC] ⚠️ SECURITY WARNING: JWT_SECRET is unset, short, or placeholder. Use a 32+ character secret for production."
      );
    }
  }

  if (isPlaceholder(process.env.MONGO_URI)) {
    throw new Error(
      "MONGO_URI must be configured before starting the server."
    );
  }

  const adminPin = String(
    process.env.ADMIN_SENSITIVE_PIN || ""
  ).trim();

  const weakPins = [
    "123456",
    "111111",
    "000000",
    "2026",
    "admin",
    "password",
  ];

  if (
    isPlaceholder(adminPin) ||
    adminPin.length < 6 ||
    weakPins.includes(adminPin.toLowerCase())
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_SENSITIVE_PIN must be set to a strong value with at least 6 characters and not a common default in production."
      );
    } else {
      console.warn(
        "[ASIATECH SYNC] ⚠️ SECURITY WARNING: ADMIN_SENSITIVE_PIN is using a weak or default value. Set a strong 6+ character PIN in .env for production."
      );
    }
  }

  const adminPassword = String(
    process.env.ADMIN_PASSWORD || ""
  ).trim();

  if (
    adminPassword &&
    (
      adminPassword.toLowerCase() === "adminsync00" ||
      adminPassword.length < 8
    )
  ) {
    console.warn(
      "[ASIATECH SYNC] ⚠️ SECURITY WARNING: ADMIN_PASSWORD in .env is using a weak or default password ('Adminsync00'). Update it to a strong password."
    );
  }
};

const checkClamAV = () => {
  if (process.env.CLAMAV_SCAN !== "true") {
    console.warn(
      "[ASIATECH SYNC] ClamAV scanning is disabled (set CLAMAV_SCAN=true if your host has ClamAV installed). Signature/type validation still runs on every upload."
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
      `[ASIATECH SYNC] ✗ ClamAV is enabled but was not found at "${process.env.CLAMSCAN_PATH}". File uploads will be rejected until ClamAV is installed or CLAMSCAN_PATH is corrected, or set CLAMAV_SCAN=false.`
    );
  }
};

/*
|--------------------------------------------------------------------------
| Production environment checks
|--------------------------------------------------------------------------
*/

const checkProductionEnv = () => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const clientUrl =
    process.env.CLIENT_URL || process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RENDER_EXTERNAL_URL;

  if (
    !clientUrl ||
    /localhost|127\.0\.0\.1/.test(clientUrl)
  ) {
    console.warn(
      `[ASIATECH SYNC] ⚠️ NODE_ENV=production but CLIENT_URL is "${
        clientUrl || "(unset)"
      }". CORS will reject your real frontend until this points at its deployed URL.`
    );
  }

  if (process.env.STORAGE_PROVIDER !== "cloudinary") {
    console.warn(
      "[ASIATECH SYNC] ⚠️ NODE_ENV=production with STORAGE_PROVIDER=local (or unset). Uploaded files will be lost on every redeploy/restart unless your host guarantees persistent disk. Set STORAGE_PROVIDER=cloudinary to fix this."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Database connection
|--------------------------------------------------------------------------
*/

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
        `[ASIATECH SYNC] Admin: ${
          adminResult.created ? "created" : "updated"
        } ${adminResult.email}`
      );
    } catch (err) {
      console.error(
        "[ASIATECH SYNC] Admin seeding error:",
        err.message
      );
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const jobResult = await seedJobs();

        console.log(
          `[ASIATECH SYNC] Jobs: ${jobResult.created} created, ${jobResult.skipped} already existed`
        );
      } catch (err) {
        console.error(
          "[ASIATECH SYNC] Jobs seeding error:",
          err.message
        );
      }
    } else {
      console.log(
        "[ASIATECH SYNC] Sample jobs are not seeded in production."
      );
    }

    try {
      const uploadedLogoResult = await seedCompanyUploadedLogos();

      console.log(
        `[ASIATECH SYNC] Logos: ${uploadedLogoResult.verified} verified, ${uploadedLogoResult.cleaned} cleaned`
      );
    } catch (err) {
      console.error(
        "[ASIATECH SYNC] ✗ Uploaded logos verification error:",
        err.message
      );
    }

    try {
      await ensureMessageHistoryCollections();

      const archivedMessages =
        await backfillMessageHistory();

      console.log(
        `[ASIATECH SYNC] Message history: ${archivedMessages} messages checked`
      );
    } catch (err) {
      console.error(
        "[ASIATECH SYNC] Message history initialization error:",
        err.message
      );
    }
  } catch (error) {
    dbConnectionFailed = true;

    console.error(
      "[ASIATECH SYNC] ✗ Database connection failed:"
    );

    console.error(
      "[ASIATECH SYNC] Error:",
      error.message
    );

    console.error("[ASIATECH SYNC]");
    console.error("[ASIATECH SYNC] Please check:");
    console.error(
      "[ASIATECH SYNC]   1. MongoDB Atlas cluster is running"
    );
    console.error(
      "[ASIATECH SYNC]   2. Your IP is whitelisted in MongoDB Atlas Network Access"
    );
    console.error(
      "[ASIATECH SYNC]   3. MONGO_URI credentials are correct"
    );
    console.error(
      "[ASIATECH SYNC]   4. You have internet connectivity"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Middleware & CORS Configuration
|--------------------------------------------------------------------------
*/

// Helper function to sanitize and format standard origins
const formatOrigin = (url) => {
  if (!url) return null;
  let formatted = url.trim();
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }
  return formatted.replace(/\/$/, ""); // Strip trailing slash
};

const rawAllowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : []),
  process.env.RAILWAY_PUBLIC_DOMAIN,
  process.env.RAILWAY_STATIC_URL,
  process.env.RENDER_EXTERNAL_URL,
];

const allowedOrigins = rawAllowedOrigins
  .map(formatOrigin)
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Allow requests with no origin (e.g. same-origin static assets, 
       * server-to-server requests, mobile apps, or Postman)
       */
      if (!origin) {
        return callback(null, true);
      }

      /*
       * Development mode: Allow all local development origins
       */
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      /*
       * Production mode: Match against configured origins
       */
      const normalizedOrigin = formatOrigin(origin);

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin is not allowed by CORS.")
      );
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
  })
);

app.use(mongoSanitize);

if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan(
      process.env.NODE_ENV === "production"
        ? "combined"
        : "dev"
    )
  );
}

/*
|--------------------------------------------------------------------------
| General API rate limit
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| Authentication rate limit
|--------------------------------------------------------------------------
*/

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.use("/api/auth", authLimiter);

/*
|--------------------------------------------------------------------------
| Uploaded files
|--------------------------------------------------------------------------
*/

app.use("/uploads", async (req, res, next) => {
  try {
    const fileUrl = `/uploads/${path.basename(
      req.path
    )}`;

    const isProtectedFile =
      await StudentProfile.exists({
        $or: [
          {
            resumeUrl: fileUrl,
          },
          {
            avatarUrl: fileUrl,
          },
        ],
      });

    if (isProtectedFile) {
      return res
        .status(404)
        .json({
          message: "File not found.",
        });
    }

    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/*
|--------------------------------------------------------------------------
| Health route
|--------------------------------------------------------------------------
*/

registerHealthRoute(app);

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| React production build
|--------------------------------------------------------------------------
*/

const clientBuildPath = path.join(
  __dirname,
  "..",
  "client",
  "build"
);

if (
  process.env.NODE_ENV === "production" &&
  fs.existsSync(
    path.join(
      clientBuildPath,
      "index.html"
    )
  )
) {
  app.use(
    express.static(clientBuildPath)
  );

  app.get("*", (req, res, next) => {
    if (
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      req.path.startsWith("/uploads/")
    ) {
      return next();
    }

    return res.sendFile(
      path.join(
        clientBuildPath,
        "index.html"
      )
    );
  });
}

/*
|--------------------------------------------------------------------------
| 404 handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res
    .status(404)
    .json({
      message: "Not found.",
    });
});

/*
|--------------------------------------------------------------------------
| Central error handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(err.stack);

    if (
      err.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(413)
        .json({
          message:
            "The uploaded file is too large. Maximum size is 5 MB.",
        });
    }

    const showDetails =
      process.env.DEBUG_ERRORS === "true";

    res
      .status(err.status || 500)
      .json({
        message: showDetails
          ? err.message
          : "Internal server error.",
      });
  }
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

const startServer = () => {
  const PORT =
    process.env.PORT || 5000;

  app.listen(
    PORT,
    () => {
      console.log(
        `[ASIATECH SYNC] Server running on port ${PORT}`
      );

      if (dbConnectionFailed) {
        console.log(
          "[ASIATECH SYNC] ⚠️ Database is NOT connected. Server running in limited mode."
        );
      } else if (!dbConnected) {
        console.log(
          "[ASIATECH SYNC] Database connection pending; full functionality will be available after MongoDB connects."
        );
      } else {
        console.log(
          "[ASIATECH SYNC] ✓ Full functionality available!"
        );
      }
    }
  );
};

/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

console.log(
  "[ASIATECH SYNC] Starting server..."
);

ensureStorageDirectories();

validateSecurityStartupConfig();

checkClamAV();

checkProductionEnv();

startServer();

startDatabaseConnection().catch(() => {
  console.log(
    "[ASIATECH SYNC] Continuing in limited mode while MongoDB is unavailable."
  );
});
