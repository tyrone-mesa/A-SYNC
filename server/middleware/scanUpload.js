const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { recordAudit } = require("../utils/securityAudit");

const matchesSignature = (filePath, extension) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  const header = fs.readFileSync(filePath).subarray(0, 16);

  if (extension === ".pdf") {
    return header.toString("ascii", 0, 5) === "%PDF-";
  }

  if ([".jpg", ".jpeg"].includes(extension)) {
    return (
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff
    );
  }

  if (extension === ".png") {
    return header.equals(
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]),
    );
  }

  if ([".doc", ".docx"].includes(extension)) {
    const isOldOfficeFormat =
      header.length >= 4 &&
      header[0] === 0xd0 &&
      header[1] === 0xcf &&
      header[2] === 0x11 &&
      header[3] === 0xe0;

    const isOfficeOpenXml =
      header.length >= 4 &&
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x03 &&
      header[3] === 0x04;

    return isOldOfficeFormat || isOfficeOpenXml;
  }

  return false;
};

const scanUploadedFile = (req, res, next) => {
  const file = req.file;

  if (!file) {
    return next();
  }

  const extension = path
    .extname(file.originalname || file.filename || "")
    .toLowerCase();

  const reject = (status, message) => {
    if (file.path) {
      fs.rm(file.path, { force: true }, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error(
            "[ASIATECH SYNC] Failed to remove rejected upload:",
            err.message,
          );
        }
      });
    }

    req.file = undefined;

    try {
      recordAudit(req, {
        action: "file_upload",
        outcome: "failure",
        user: req.user,
        details: message,
      });
    } catch (auditError) {
      console.error(
        "[ASIATECH SYNC] Failed to record upload audit:",
        auditError.message,
      );
    }

    return res.status(status).json({ message });
  };

  try {
    /*
     * Multer uses diskStorage(), so every upload must have a real
     * local staging file before persistUpload() sends it to Cloudinary.
     */
    if (!file.path || !fs.existsSync(file.path)) {
      return reject(
        400,
        "The uploaded file could not be inspected and was rejected.",
      );
    }

    const stats = fs.statSync(file.path);

    if (!stats.isFile() || stats.size === 0) {
      return reject(
        400,
        "The uploaded file could not be inspected and was rejected.",
      );
    }

    /*
     * Verify the actual file contents against its extension.
     * This prevents a renamed malicious/non-image file from
     * being accepted as a company logo.
     */
    if (!matchesSignature(file.path, extension)) {
      return reject(
        400,
        "The uploaded file failed its type validation and was rejected.",
      );
    }
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] Upload inspection failed:",
      error.message,
    );

    return reject(
      400,
      "The uploaded file could not be inspected and was rejected.",
    );
  }

  /*
   * ClamAV is optional.
   *
   * When CLAMAV_SCAN is not "true", the upload continues after
   * signature validation. This matches the current Railway setup
   * where ClamAV is disabled.
   */
  if (process.env.CLAMAV_SCAN !== "true") {
    try {
      recordAudit(req, {
        action: "file_upload",
        outcome: "success",
        user: req.user,
        details: `Validated ${file.originalname}`,
      });
    } catch (auditError) {
      console.error(
        "[ASIATECH SYNC] Failed to record upload audit:",
        auditError.message,
      );
    }

    return next();
  }

  /*
   * Optional ClamAV scan.
   */
  execFile(
    process.env.CLAMSCAN_PATH || "clamscan",
    ["--no-summary", file.path],
    (error) => {
      if (!error) {
        try {
          recordAudit(req, {
            action: "file_upload",
            outcome: "success",
            user: req.user,
            details: `ClamAV cleared ${file.originalname}`,
          });
        } catch (auditError) {
          console.error(
            "[ASIATECH SYNC] Failed to record upload audit:",
            auditError.message,
          );
        }

        return next();
      }

      if (error.code === "ENOENT") {
        return reject(
          503,
          "Malware scanning is unavailable. Please contact the administrator.",
        );
      }

      return reject(
        400,
        "The uploaded file was rejected because it failed malware scanning.",
      );
    },
  );
};

module.exports = scanUploadedFile;
