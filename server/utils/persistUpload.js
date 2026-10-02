const fs = require("fs");
const path = require("path");
const {
  STORAGE_PROVIDER,
  uploadToCloudinary,
} = require("./storage");

/**
 * Stores an uploaded file and returns the URL/path
 * that should be saved in MongoDB.
 *
 * Supports:
 * - Local storage
 * - Cloudinary storage
 * - Files that have ALREADY been uploaded to Cloudinary
 */
async function persistUpload(
  file,
  { folder = "async-uploads" } = {},
) {
  if (!file) return null;

  // LOCAL STORAGE
  if (STORAGE_PROVIDER !== "cloudinary") {
    return file.uploadFolder
      ? `/uploads/${file.uploadFolder}/${file.filename}`
      : `/uploads/${file.filename}`;
  }

  // --------------------------------------------------
  // CLOUDINARY
  // --------------------------------------------------

  // If upload middleware already uploaded the file to
  // Cloudinary, file.path will already be a URL.
  // DO NOT upload it again.
  if (
    typeof file.path === "string" &&
    /^https?:\/\//i.test(file.path)
  ) {
    console.log(
      "[ASIATECH SYNC] File is already on Cloudinary. Using existing URL.",
    );

    return file.path;
  }

  // Otherwise, upload the local staged file.
  const publicId = `${folder}/${path.parse(file.filename).name}`;

  const url = await uploadToCloudinary(file.path, {
    publicId,
  });

  // Remove the local temporary copy.
  if (file.path) {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error(
          "[ASIATECH SYNC] Failed to clean up local upload staging copy:",
          err.message,
        );
      }
    });
  }

  return url;
}


/**
 * Renames a LOCAL uploaded file.
 *
 * IMPORTANT:
 * Cloudinary files must NOT be renamed with fs.rename().
 * Cloudinary returns URLs such as:
 *
 * https://res.cloudinary.com/...
 *
 * Those URLs are not local filesystem paths.
 */
const renameUpload = async (file, name) => {
  if (!file || !name) return file;

  // Never rename Cloudinary uploads locally.
  if (STORAGE_PROVIDER === "cloudinary") {
    console.log(
      "[ASIATECH SYNC] Cloudinary storage detected. Skipping local rename.",
    );

    return file;
  }

  // Extra protection in case file.path is already a URL.
  if (
    typeof file.path === "string" &&
    /^https?:\/\//i.test(file.path)
  ) {
    console.log(
      "[ASIATECH SYNC] Remote file detected. Skipping local rename.",
    );

    return file;
  }

  const safeName = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  if (!safeName) return file;

  const extension = path.extname(file.filename);
  const renamedFilename = `${safeName}${extension}`;

  const renamedPath = path.join(
    path.dirname(file.path),
    renamedFilename,
  );

  if (renamedPath !== file.path) {
    await fs.promises.rm(renamedPath, {
      force: true,
    });

    await fs.promises.rename(
      file.path,
      renamedPath,
    );

    file.filename = renamedFilename;
    file.path = renamedPath;
  }

  return file;
};


module.exports = {
  persistUpload,
  renameUpload,
};
