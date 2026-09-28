const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { recordAudit } = require("../utils/securityAudit");

const matchesSignature = (filePath, extension) => {
  const header = fs.readFileSync(filePath).subarray(0, 8);
  if (extension === ".pdf") return header.toString("ascii", 0, 5) === "%PDF-";
  if ([".jpg", ".jpeg"].includes(extension))
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (extension === ".png")
    return header.equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  if ([".doc", ".docx"].includes(extension))
    return (
      (header[0] === 0xd0 &&
        header[1] === 0xcf &&
        header[2] === 0x11 &&
        header[3] === 0xe0) ||
      (header[0] === 0x50 &&
        header[1] === 0x4b &&
        header[2] === 0x03 &&
        header[3] === 0x04)
    );
  return false;
};

const scanUploadedFile = (req, res, next) => {
  const file = req.file;
  if (!file) return next();
  const extension = path.extname(file.originalname || "").toLowerCase();
  const reject = (status, message) => {
    fs.rm(file.path, { force: true }, () => {});
    req.file = undefined;
    recordAudit(req, {
      action: "file_upload",
      outcome: "failure",
      user: req.user,
      details: message,
    });
    res.status(status).json({ message });
  };

  try {
    if (!matchesSignature(file.path, extension))
      return reject(
        400,
        "The uploaded file failed its type validation and was rejected.",
      );
  } catch {
    return reject(
      400,
      "The uploaded file could not be inspected and was rejected.",
    );
  }

  if (process.env.CLAMAV_SCAN !== "true") {
    recordAudit(req, {
      action: "file_upload",
      outcome: "success",
      user: req.user,
      details: `Scanned ${file.originalname}`,
    });
    return next();
  }
  execFile(
    process.env.CLAMSCAN_PATH || "clamscan",
    ["--no-summary", file.path],
    (error) => {
      if (!error) {
        recordAudit(req, {
          action: "file_upload",
          outcome: "success",
          user: req.user,
          details: `ClamAV cleared ${file.originalname}`,
        });
        return next();
      }
      if (error.code === "ENOENT")
        return reject(
          503,
          "Malware scanning is unavailable. Please contact the administrator.",
        );
      return reject(
        400,
        "The uploaded file was rejected because it failed malware scanning.",
      );
    },
  );
};

module.exports = scanUploadedFile;
