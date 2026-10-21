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

/** True if the stored reference still points at a real file. Locaw
