const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
    const destination = folder ? path.join(uploadDir, folder) : uploadDir;
    if (!fs.existsSync(destination))
      fs.mkdirSync(destination, { recursive: true });
    file.uploadFolder = folder || "";
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

// General-purpose upload (used for transcripts/COR) — PDF, Word, or a scanned image, 5MB max.
const generalTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
const generalFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (generalTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: PDF, DOC, DOCX, JPG, PNG."));
  }
};

const upload = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const isPdfLike = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  return (
    ext === ".pdf" ||
    mime === "application/pdf" ||
    mime === "application/octet-stream"
  );
};

// Resume-specific upload — strictly PDF only, 5MB max, since resumes get emailed straight to
// companies as an attachment and need a predictable, universally-openable format.
const resumeFileFilter = (req, file, cb) => {
  if (isPdfLike(file)) {
    cb(null, true);
  } else {
    cb(new Error("Resumes must be uploaded as a .pdf file."));
  }
};

const uploadResume = multer({
  storage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Company logo upload — JPG, JPEG, PNG only, 3MB max
const logoFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedTypes = [".jpg", ".jpeg", ".png"];

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Company logo must be JPG, JPEG, or PNG format."));
  }
};

const uploadLogo = multer({
  storage,
  fileFilter: logoFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max for images
});

// Student profile pictures are managed only by admins. PDFs are accepted because the
// registration requirement allows the admin office to attach a scanned profile document.
const avatarFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".pdf"].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Student profile picture must be JPG, PNG, or PDF format."));
  }
};

const uploadStudentAvatar = multer({
  storage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
module.exports.uploadResume = uploadResume;
module.exports.uploadLogo = uploadLogo;
module.exports.uploadStudentAvatar = uploadStudentAvatar;
