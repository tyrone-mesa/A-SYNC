const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const util = require("util");

const execFileAsync = util.promisify(execFile);

const REJECTION_MESSAGE =
  "The uploaded file could not be inspected and was rejected.";

// Images (avatars, logos) plus documents (resume, transcript/COR, certificates).
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
  ".doc",
  ".docx",
]);

const ALLOWED_MIMETYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const CLOUDINARY_HOSTS = new Set([
  "res.cloudinary.com",
  "cloudinary.com",
]);

// Upload middleware (multer) already enforces each route's own limit (3MB or 5MB).
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isCloudinaryFile(file) {
  if (!file) return false;

  if (
    String(file.destination || "")
      .toLowerCase()
      .includes("cloudinary")
  ) {
    return true;
  }

  const possibleUrls = [
    file.path,
    file.secure_url,
    file.secureUrl,
    file.url,
  ].filter(Boolean);

  return possibleUrls.some((value) => {
    try {
      const url = new URL(String(value));

      return CLOUDINARY_HOSTS.has(
        url.hostname.toLowerCase(),
      );
    } catch {
      return false;
    }
  });
}

function getExtension(file) {
  const originalName = String(
    file.originalname || "",
  ).toLowerCase();

  const originalExt =
    path.extname(originalName);

  if (originalExt) {
    return originalExt;
  }

  const possiblePath =
    file.path ||
    file.secure_url ||
    file.secureUrl ||
    file.url ||
    "";

  try {
    const url = new URL(
      String(possiblePath),
    );

    const pathname =
      url.pathname.toLowerCase();

    return path.extname(pathname);
  } catch {
    return "";
  }
}

function validateBasicImageInfo(file) {
  if (!file) {
    return {
      valid: false,
      reason: "No uploaded file.",
    };
  }

  if (
    file.size &&
    Number(file.size) > MAX_FILE_SIZE
  ) {
    return {
      valid: false,
      reason: "File exceeds the 3MB limit.",
    };
  }

  const extension =
    getExtension(file);

  const mimetype =
    String(
      file.mimetype || "",
    ).toLowerCase();

  if (
    !ALLOWED_EXTENSIONS.has(
      extension,
    )
  ) {
    return {
      valid: false,
      reason:
        "File extension is not allowed.",
    };
  }

  if (
    !ALLOWED_MIMETYPES.has(
      mimetype,
    )
  ) {
    return {
      valid: false,
      reason:
        "File MIME type is not allowed.",
    };
  }

  return {
    valid: true,
    extension,
    mimetype,
  };
}

function readFileHeader(
  filePath,
  length = 16,
) {
  return new Promise(
    (resolve, reject) => {
      const stream =
        fs.createReadStream(
          filePath,
          {
            start: 0,
            end: length - 1,
          },
        );

      const chunks = [];

      stream.on(
        "data",
        (chunk) => {
          chunks.push(chunk);
        },
      );

      stream.on(
        "end",
        () => {
          resolve(
            Buffer.concat(chunks),
          );
        },
      );

      stream.on(
        "error",
        reject,
      );
    },
  );
}

function isJpeg(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isPng(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isPdf(buffer) {
  // "%PDF"
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

function isLegacyDoc(buffer) {
  // OLE2 compound file header (.doc)
  return (
    buffer.length >= 4 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

function isZipContainer(buffer) {
  // "PK\x03\x04" (.docx is a zip)
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

async function inspectLocalFile(file) {
  if (!file.path) {
    return {
      valid: false,
      reason:
        "Uploaded file has no local path.",
    };
  }

  if (
    !fs.existsSync(file.path)
  ) {
    console.error(
      "[ASIATECH SYNC] Could not locate uploaded file on disk:",
      file.path,
    );

    return {
      valid: false,
      reason:
        "Uploaded file does not exist on disk.",
    };
  }

  const basic =
    validateBasicImageInfo(file);

  if (!basic.valid) {
    return basic;
  }

  let header;

  try {
    header =
      await readFileHeader(
        file.path,
        16,
      );
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] Failed to read uploaded file:",
      error.message,
    );

    return {
      valid: false,
      reason:
        "Uploaded file could not be read.",
    };
  }

  let signatureValid = false;

  if (
    basic.extension === ".jpg" ||
    basic.extension === ".jpeg"
  ) {
    signatureValid =
      isJpeg(header);
  } else if (
    basic.extension === ".png"
  ) {
    signatureValid =
      isPng(header);
  } else if (
    basic.extension === ".pdf"
  ) {
    signatureValid =
      isPdf(header);
  } else if (
    basic.extension === ".doc"
  ) {
    signatureValid =
      isLegacyDoc(header);
  } else if (
    basic.extension === ".docx"
  ) {
    signatureValid =
      isZipContainer(header);
  }

  if (!signatureValid) {
    console.error(
      "[ASIATECH SYNC] File signature does not match extension.",
      {
        filename:
          file.originalname,
        extension:
          basic.extension,
        mimetype:
          basic.mimetype,
      },
    );

    return {
      valid: false,
      reason:
        "File signature does not match its extension.",
    };
  }

  return {
    valid: true,
    ...basic,
  };
}

async function scanWithClamAV(
  filePath,
) {
  const enabled =
    String(
      process.env.CLAMAV_ENABLED || "",
    ).toLowerCase() === "true";

  if (!enabled) {
    return {
      clean: true,
      skipped: true,
    };
  }

  if (
    !filePath ||
    !fs.existsSync(filePath)
  ) {
    return {
      clean: false,
      skipped: false,
      reason:
        "File does not exist for antivirus scanning.",
    };
  }

  try {
    await execFileAsync(
      "clamdscan",
      [
        "--no-summary",
        filePath,
      ],
      {
        timeout: 30000,
      },
    );

    return {
      clean: true,
      skipped: false,
    };
  } catch (error) {
    const exitCode =
      typeof error.code ===
      "number"
        ? error.code
        : null;

    if (exitCode === 1) {
      return {
        clean: false,
        skipped: false,
        reason:
          "ClamAV detected a threat.",
      };
    }

    if (
      exitCode === 127 ||
      String(
        error.message || "",
      ).includes("not found")
    ) {
      console.warn(
        "[ASIATECH SYNC] ClamAV is enabled but clamdscan is unavailable. Upload rejected.",
      );

      return {
        clean: false,
        skipped: false,
        reason:
          "Antivirus scanner is unavailable.",
      };
    }

    console.error(
      "[ASIATECH SYNC] ClamAV scan failed:",
      error.message,
    );

    return {
      clean: false,
      skipped: false,
      reason:
        "Antivirus scan failed.",
    };
  }
}

async function scanCloudinaryFile(
  file,
) {
  console.log(
    "[ASIATECH SYNC] Cloudinary upload detected. Skipping local-disk inspection.",
  );

  const basic =
    validateBasicImageInfo(file);

  if (!basic.valid) {
    console.error(
      "[ASIATECH SYNC] Cloudinary file rejected:",
      basic.reason,
    );

    return basic;
  }

  const cloudinaryUrl =
    file.secure_url ||
    file.secureUrl ||
    file.path ||
    file.url;

  if (!cloudinaryUrl) {
    return {
      valid: false,
      reason:
        "Cloudinary upload has no URL.",
    };
  }

  let parsedUrl;

  try {
    parsedUrl =
      new URL(
        String(cloudinaryUrl),
      );
  } catch {
    return {
      valid: false,
      reason:
        "Cloudinary returned an invalid URL.",
    };
  }

  if (
    !CLOUDINARY_HOSTS.has(
      parsedUrl.hostname.toLowerCase(),
    )
  ) {
    return {
      valid: false,
      reason:
        "Uploaded file is not stored on an approved Cloudinary host.",
    };
  }

  const pathname =
    parsedUrl.pathname.toLowerCase();

  if (
    !pathname.includes("/image/upload/") &&
    !pathname.includes("/raw/upload/")
  ) {
    return {
      valid: false,
      reason:
        "Cloudinary resource is not an image or document upload.",
    };
  }

  file.secure_url =
    cloudinaryUrl;

  file.secureUrl =
    cloudinaryUrl;

  file.scanStatus =
    "cloudinary-validated";

  file.scanPassed =
    true;

  file.inspected =
    true;

  console.log(
    "[ASIATECH SYNC] Cloudinary image accepted:",
    {
      originalname:
        file.originalname,
      mimetype:
        file.mimetype,
      size:
        file.size,
      url:
        cloudinaryUrl,
    },
  );

  return {
    valid: true,
    ...basic,
  };
}

async function scanUploadedFile(
  req,
  res,
  next,
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message:
          "No file uploaded.",
      });
    }

    console.log(
      "[ASIATECH SYNC] Inspecting uploaded file:",
      {
        originalname:
          req.file.originalname,
        filename:
          req.file.filename,
        mimetype:
          req.file.mimetype,
        destination:
          req.file.destination,
        uploadFolder:
          req.file.uploadFolder,
        path:
          req.file.path,
        size:
          req.file.size,
      },
    );

    let result;

    /*
     * IMPORTANT:
     * Company logos are currently uploaded directly
     * to Cloudinary by Multer.
     *
     * Therefore we MUST NOT call fs.existsSync()
     * against the Cloudinary URL.
     */
    if (
      isCloudinaryFile(
        req.file,
      )
    ) {
      result =
        await scanCloudinaryFile(
          req.file,
        );
    } else {
      result =
        await inspectLocalFile(
          req.file,
        );

      if (result.valid) {
        const antivirus =
          await scanWithClamAV(
            req.file.path,
          );

        if (!antivirus.clean) {
          result = {
            valid: false,
            reason:
              antivirus.reason ||
              "Antivirus scan failed.",
          };
        }
      }
    }

    if (!result.valid) {
      console.error(
        "[ASIATECH SYNC] Upload rejected:",
        result.reason,
      );

      return res.status(400).json({
        message:
          REJECTION_MESSAGE,
      });
    }

    req.file.scanStatus =
      req.file.scanStatus ||
      "validated";

    req.file.scanPassed =
      true;

    req.file.inspected =
      true;

    return next();
  } catch (error) {
    console.error(
      "[ASIATECH SYNC] Upload inspection error:",
      error,
    );

    return res.status(400).json({
      message:
        REJECTION_MESSAGE,
    });
  }
}

module.exports =
  scanUploadedFile;
