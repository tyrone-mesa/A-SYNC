const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// STORAGE_PROVIDER=local (default) keeps the original behavior completely unchanged: files
// live in server/uploads on local disk and every existing "/uploads/<filename>" URL, DB
// field, and access-control check keeps working exactly as before.
//
// STORAGE_PROVIDER=cloudinary is an opt-in for hosts with ephemeral disks (Render, Railway,
// Heroku, etc.) where local files get wiped on every redeploy/restart. In that mode, uploaded
// files are pushed to Cloudinary right after they land in the local staging folder (see
// persistUpload.js) and the DB field stores the full Cloudinary URL instead of a local path.
const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || "local")
  .trim()
  .toLowerCase();

let cloudinary = null;
if (STORAGE_PROVIDER === "cloudinary") {
  cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const isRemoteUrl = (fileUrl) => /^https?:\/\//i.test(fileUrl || "");

const localPathFor = (fileUrl) => {
  const uploadRoot = path.resolve(__dirname, "..", "uploads");
  const relativePath = String(fileUrl || "")
    .replace(/^\/uploads\//i, "")
    .replace(/^[/\\]+/, "");
  const localPath = path.resolve(uploadRoot, relativePath);
  return localPath.startsWith(`${uploadRoot}${path.sep}`)
    ? localPath
    : uploadRoot;
};

/** Uploads a local file (already written to disk by multer) to Cloudinary and returns its
 *  secure URL. resource_type: "auto" lets Cloudinary decide image vs raw (PDFs/docs) —
 *  we record which one it picked in the returned URL itself ("/image/upload/" vs
 *  "/raw/upload/") so removeFile() can target the same resource_type later. */
async function uploadToCloudinary(localFilePath, { publicId }) {
  if (!cloudinary) {
    throw new Error(
      "Cloudinary is not configured (STORAGE_PROVIDER=cloudinary requires CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).",
    );
  }
  const result = await cloudinary.uploader.upload(localFilePath, {
    public_id: publicId,
    resource_type: "auto",
    overwrite: true,
  });
  return result.secure_url;
}

const resourceTypeFromUrl = (fileUrl) => {
  if (fileUrl.includes("/video/upload/")) return "video";
  if (fileUrl.includes("/raw/upload/")) return "raw";
  return "image";
};

// Cloudinary URLs look like:
//   https://res.cloudinary.com/<cloud>/<type>/upload/v<version>/<public_id>.<ext>
// We choose the public_id ourselves at upload time, so we can recover it from the URL
// without needing a separate DB column for it.
// NOTE: for "raw" files (Word docs etc.) the extension is PART of the public_id, while for
// image/video it is only the delivery format.
const parseCloudinaryUrl = (fileUrl) => {
  const resourceType = resourceTypeFromUrl(fileUrl);
  const match = String(fileUrl)
    .split(/[?#]/)[0]
    .match(/\/upload\/(?:[^/]*,[^/]*\/)*(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  const full = decodeURIComponent(match[1]);
  const extMatch = full.match(/\.([a-zA-Z0-9]+)$/);
  const format = extMatch ? extMatch[1].toLowerCase() : "";
  const publicId =
    resourceType === "raw" || !extMatch ? full : full.slice(0, -(format.length + 1));
  return { resourceType, publicId, format };
};

const publicIdFromUrl = (fileUrl) => parseCloudinaryUrl(fileUrl)?.publicId || null;

/** Deletes an uploaded file regardless of which provider stored it. Safe to call with an
 *  empty/undefined value — returns true (nothing to do) in that case. */
async function removeFile(fileUrl) {
  if (!fileUrl) return true;

  if (!isRemoteUrl(fileUrl)) {
    try {
      const localPath = localPathFor(fileUrl);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      return !fs.existsSync(localPath);
    } catch (err) {
      console.error(
        "[ASIATECH SYNC] Failed to remove local file:",
        err.message,
      );
      return false;
    }
  }

  if (!cloudinary) return true; // stored remotely but this server isn't configured for it
  const publicId = publicIdFromUrl(fileUrl);
  if (!publicId) return true;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceTypeFromUrl(fileUrl),
    });
    return true;
  } catch (err) {
    console.error(
      "[ASIATECH SYNC] Failed to remove Cloudinary file:",
      err.message,
    );
    return false;
  }
}

/** True if the stored reference still points at a real file. Local paths are checked on
 *  disk; remote URLs are trusted (Cloudinary's own durability) rather than round-tripping
 *  on every check — this is also what fixes the "redeploy wipes logos" bug, since a
 *  Cloudinary URL should never be treated as missing just because local disk was wiped. */
function fileStillExists(fileUrl) {
  if (!fileUrl) return false;
  if (isRemoteUrl(fileUrl)) return true;
  return fs.existsSync(localPathFor(fileUrl));
}

/** Builds a Content-Disposition header that is safe for any file name. Node rejects header
 *  values with non-ASCII characters (e.g. "Résumé.pdf"), which used to make the file fail
 *  to open, so an ASCII fallback plus an RFC 5987 UTF-8 name are sent instead. */
const contentDisposition = (disposition, filename) => {
  const asciiName =
    String(filename || "file")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_") || "file";
  const utf8Name = encodeURIComponent(String(filename || "file")).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
};

/** Streams a stored file back through an Express response, whether it's on local disk or
 *  at a remote URL, and handles the 404 case itself so route handlers don't have to. */
function serveFile(
  res,
  fileUrl,
  { mimetype, disposition = "inline", filename } = {},
) {
  if (!fileUrl) {
    return res.status(404).json({ message: "File not found." });
  }

  if (!isRemoteUrl(fileUrl)) {
    const localPath = localPathFor(fileUrl);
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ message: "File not found." });
    }
    if (disposition === "attachment") {
      return res.download(localPath, filename || path.basename(localPath));
    }
    res.type(mimetype || path.extname(localPath));
    res.setHeader("Content-Disposition", "inline");
    return res.sendFile(localPath);
  }

  // Remote file (Cloudinary). Cloudinary accounts commonly block delivery of PDFs/ZIPs on
  // the public URL (HTTP 401/403), which used to be reported as "File not found". So a
  // signed API download URL is tried first (it is not affected by that restriction), then
  // the stored URL as a fallback.
  const candidates = [];
  if (cloudinary) {
    const parsed = parseCloudinaryUrl(fileUrl);
    if (parsed) {
      try {
        candidates.push(
          cloudinary.utils.private_download_url(
            parsed.publicId,
            parsed.resourceType === "raw" ? "" : parsed.format,
            {
              resource_type: parsed.resourceType,
              type: "upload",
              attachment: false,
              expires_at: Math.floor(Date.now() / 1000) + 300,
            },
          ),
        );
      } catch (err) {
        console.error(
          "[ASIATECH SYNC] Could not sign Cloudinary download URL:",
          err.message,
        );
      }
    }
  }
  candidates.push(fileUrl);

  const fetchRemote = (url, redirectsLeft = 4) =>
    new Promise((resolve, reject) => {
      const client = url.startsWith("https") ? https : http;
      const request = client.get(url, (upstream) => {
        const status = upstream.statusCode || 0;
        if (status >= 300 && status < 400 && upstream.headers.location) {
          upstream.resume();
          if (redirectsLeft <= 0) return reject(new Error("Too many redirects"));
          const next = new URL(upstream.headers.location, url).toString();
          return resolve(fetchRemote(next, redirectsLeft - 1));
        }
        resolve(upstream);
      });
      request.setTimeout(20000, () => request.destroy(new Error("Timed out")));
      request.on("error", reject);
    });

  (async () => {
    let lastStatus = 0;
    for (const url of candidates) {
      try {
        const upstream = await fetchRemote(url);
        const status = upstream.statusCode || 0;
        if (status >= 400) {
          lastStatus = status;
          console.error(
            `[ASIATECH SYNC] Remote file request returned HTTP ${status} for ${url.split("?")[0]}`,
          );
          upstream.resume();
          continue;
        }
        res.setHeader(
          "Content-Type",
          mimetype ||
            upstream.headers["content-type"] ||
            "application/octet-stream",
        );
        res.setHeader(
          "Content-Disposition",
          contentDisposition(
            disposition,
            filename || path.basename(fileUrl.split("?")[0]),
          ),
        );
        return upstream.pipe(res);
      } catch (err) {
        console.error("[ASIATECH SYNC] Failed to fetch remote file:", err.message);
      }
    }
    if (res.headersSent) return;
    // Only a real 404 means the file is gone; anything else is a storage-side problem.
    if (lastStatus === 404) {
      return res.status(404).json({ message: "File not found." });
    }
    return res
      .status(502)
      .json({ message: "File could not be retrieved from storage." });
  })();
}

module.exports = {
  STORAGE_PROVIDER,
  isRemoteUrl,
  uploadToCloudinary,
  removeFile,
  fileStillExists,
  serveFile,
};
