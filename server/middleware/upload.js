const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");

// ============================================================
// CLOUDINARY CONFIGURATION
// ============================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// LOCAL STORAGE
// Used for transcripts, COR, resumes, and student avatars.
// Company logos use Cloudinary instead.
// ============================================================

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadFolders = {
  avatar: "student-profile-photos",
  logo: "company-logos",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = uploadFolders[file.fieldname];
    const destination = folder
      ? path.join(uploadDir, folder)
      : uploadDir;

    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    file.uploadFolder = folder || "";

    cb(null, destination);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;

    const userId = req.user?.id || "user";

    cb(
      null,
      `${userId}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`
    );
  },
});

// ============================================================
// GENERAL UPLOAD
// Transcripts / COR
// PDF, Word, JPG, JPEG, PNG
// Maximum 5MB
// ============================================================

const generalTypes = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
];

const generalFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (generalTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file type. Allowed: PDF, DOC, DOCX, JPG, PNG."
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ============================================================
// PDF CHECK
// ============================================================

const isPdfLike = (file) => {
  const ext = path
    .extname(file.originalname || "")
    .toLowerCase();

  const mime = (file.mimetype || "").toLowerCase();

  return (
    ext === ".pdf" ||
    mime === "application/pdf" ||
    mime === "application/octet-stream"
  );
};

// ============================================================
// RESUME UPLOAD
// PDF ONLY
// Maximum 5MB
// ============================================================

const resumeFileFilter = (req, file, cb) => {
  if (isPdfLike(file)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Resumes must be uploaded as a .pdf file."
      )
    );
  }
};

const uploadResume = multer({
  storage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ============================================================
// CLOUDINARY STORAGE ENGINE FOR COMPANY LOGOS
// ============================================================

const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    const userId = req.user?.id || "company";

    const publicId = `company-logo-${userId}-${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "asiatech-sync/company-logos",
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error(
            "[ASIATECH SYNC] Cloudinary logo upload failed:",
            error
          );

          return cb(error);
        }

        if (!result || !result.secure_url) {
          return cb(
            new Error(
              "Cloudinary did not return a valid image URL."
            )
          );
        }

        // These properties are intentionally compatible
        // with the normal multer file object.
        cb(null, {
          path: result.secure_url,
          secure_url: result.secure_url,
          url: result.secure_url,
          filename: result.public_id,
          public_id: result.public_id,
          destination: "cloudinary",
          size: result.bytes,
          mimetype: file.mimetype,
          originalname: file.originalname,
        });
      }
    );

    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, cb) {
    if (!file.public_id) {
      return cb(null);
    }

    cloudinary.uploader.destroy(
      file.public_id,
      {
        resource_type: "image",
      },
      (error) => {
        if (error) {
          console.error(
            "[ASIATECH SYNC] Failed to remove Cloudinary logo:",
            error
          );
        }

        cb(null);
      }
    );
  },
};

// ============================================================
// COMPANY LOGO VALIDATION
// JPG, JPEG, PNG
// Maximum 3MB
// ============================================================

const logoFileFilter = (req, file, cb) => {
  const ext = path
    .extname(file.originalname)
    .toLowerCase();

  const allowedTypes = [
    ".jpg",
    ".jpeg",
    ".png",
  ];

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Company logo must be JPG, JPEG, or PNG format."
      )
    );
  }
};

// ============================================================
// COMPANY LOGO UPLOAD
// NOW USES CLOUDINARY
// ============================================================

const uploadLogo = multer({
  storage: cloudinaryStorage,

  fileFilter: logoFileFilter,

  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

// ============================================================
// STUDENT PROFILE PICTURE
// JPG, JPEG, PNG, PDF
// Maximum 5MB
// ============================================================

const avatarFileFilter = (req, file, cb) => {
  const ext = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    [".jpg", ".jpeg", ".png", ".pdf"].includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Student profile picture must be JPG, PNG, or PDF format."
      )
    );
  }
};

const uploadStudentAvatar = multer({
  storage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ============================================================
// EXPORTS
// ============================================================

module.exports = upload;

module.exports.uploadResume = uploadResume;

module.exports.uploadLogo = uploadLogo;

module.exports.uploadStudentAvatar =
  uploadStudentAvatar;
