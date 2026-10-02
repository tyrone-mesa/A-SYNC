const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { recordAudit } = require("../utils/securityAudit");

function getActualFilePath(file) {
  if (!file) return null;

  // Normal Multer diskStorage path
  if (file.path && fs.existsSync(file.path)) {
    return file.path;
  }

  // Try destination + filename
  if (file.destination && file.filename) {
    const candidate = path.join(file.destination, file.filename);

    if (fs.existsSync(candidate)) {
      file.path = candidate;
      return candidate;
    }
  }

  // Try destination + uploadFolder + filename
  if (file.destination && file.uploadFolder && file.filename) {
    const candidate = path.join(
      file.destination,
      file.uploadFolder,
      file.filename,
    );

    if (fs.existsSync(candidate)) {
      file.path = candidate;
      return candidate;
    }
  }

  return null;
}

function matchesSignature(filePath, extension) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  const header = fs.readFileSync(filePath).subarray(0, 16);

  // JPEG
  if (extension === ".jpg" || extension === ".jpeg") {
    return (
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff
    );
  }

  // PNG
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

  // PDF
  if (extension === ".pdf") {
    return header.toString("ascii", 0, 5) === "%PDF-";
  }

  // DOC
  if (extension === ".doc") {
    return (
      header.length >= 4 &&
      header[0] === 0xd0 &&
      header[1] === 0xcf &&
      header[2] === 0x11 &&
      header[3] === 0xe0
    );
  }

  // DOCX
  if (extension === ".docx") {
    return (
      header.length >= 4 &&
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x03 &&
      header[3] === 0x04
    );
  }

  return false;
}

function audit(req, outcome, details) {
  try {
    recordAudit(req, {
      action: "file_upload",
      outcome,
      user: req.user,
      details,
    });
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] Upload audit failed:",
      error.message,
    );
  }
}

function removeRejectedFile(filePath) {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] Failed to remove rejected upload:",
      error.message,
    );
  }
}

function reject(req, res, file, status, message) {
  const filePath = getActualFilePath(file);

  removeRejectedFile(filePath);

  audit(req, "failure", message);

  return res.status(status).json({
    message,
  });
}

const scanUploadedFile = (req, res, next) => {
  const file = req.file;

  // Nothing uploaded
  if (!file) {
    return next();
  }

  try {
    console.log("[ASIATECH SYNC] Inspecting uploaded file:", {
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      destination: file.destination,
      uploadFolder: file.uploadFolder,
      path: file.path,
    });

    /*
     * Make absolutely sure we have the real local file.
     */
    const actualPath = getActualFilePath(file);

    if (!actualPath) {
      console.error(
        "[ASIATECH SYNC] Could not locate uploaded file on disk.",
      );

      return reject(
        req,
        res,
        file,
        400,
        "The uploaded file could not be inspected and was rejected.",
      );
    }

    file.path = actualPath;

    const stats = fs.statSync(actualPath);

    if (!stats.isFile() || stats.size <= 0) {
      return reject(
        req,
        res,
        file,
        400,
        "The uploaded file could not be inspected and was rejected.",
      );
    }

    const extension = path
      .extname(file.originalname || file.filename || "")
      .toLowerCase();

    /*
     * Company logos are JPG/JPEG/PNG.
     * Other upload routes may also pass through this middleware.
     */
    const validExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
      ".doc",
      ".docx",
    ];

    if (!validExtensions.includes(extension)) {
      return reject(
        req,
        res,
        file,
        400,
        "The uploaded file type is not allowed.",
      );
    }

    /*
     * Verify the actual binary signature.
     */
    if (!matchesSignature(actualPath, extension)) {
      console.error(
        "[ASIATECH SYNC] File signature mismatch:",
        extension,
        actualPath,
      );

      return reject(
        req,
        res,
        file,
        400,
        "The uploaded file failed its type validation and was rejected.",
      );
    }

    /*
     * ClamAV is optional.
     * Railway currently has ClamAV disabled, so continue normally.
     */
    if (process.env.CLAMAV_SCAN !== "true") {
      console.log(
        `[ASIATECH SYNC] File inspection passed: ${file.originalname}`,
      );

      audit(
        req,
        "success",
        `Validated ${file.originalname}`,
      );

      return next();
    }

    /*
     * Optional ClamAV scan.
     */
    execFile(
      process.env.CLAMSCAN_PATH || "clamscan",
      ["--no-summary", actualPath],
      (error) => {
        if (!error) {
          console.log(
            `[ASIATECH SYNC] ClamAV passed: ${file.originalname}`,
          );

          audit(
            req,
            "success",
            `ClamAV cleared ${file.originalname}`,
          );

          return next();
        }

        if (error.code === "ENOENT") {
          return reject(
            req,
            res,
            file,
            503,
            "Malware scanning is unavailable. Please contact the administrator.",
          );
        }

        return reject(
          req,
          res,
          file,
          400,
          "The uploaded file was rejected because it failed malware scanning.",
        );
      },
    );
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] Upload inspection error:",
      error,
    );

    return reject(
      req,
      res,
      file,
      400,
      "The uploaded file could not be inspected and was rejected.",
    );
  }
};

module.exports = scanUploadedFile;
