const fs = require("fs");
const path = require("path");
const { STORAGE_PROVIDER, uploadToCloudinary } = require("./storage");

/**
 * Call this right after multer + scanUploadedFile have accepted a file, before saving
 * anything to the database. It decides where the file ultimately lives and returns the
 * string that should go in the Mongoose field (resumeUrl, avatarUrl, companyUploadedLogo,
 * transcriptUrl, certificateUrl, etc).
 *
 * - STORAGE_PROVIDER=local (default): no-op, file already lives in server/uploads.
 *   Returns "/uploads/<filename>", exactly as before.
 * - STORAGE_PROVIDER=cloudinary: uploads the local staged copy to Cloudinary, deletes the
 *   local temp copy, and returns the Cloudinary secure URL instead.
 */
async function persistUpload(file, { folder = "async-uploads" } = {}) {
  if (!file) return null;

  if (STORAGE_PROVIDER !== "cloudinary") {
    return file.uploadFolder
      ? `/uploads/${file.uploadFolder}/${file.filename}`
      : `/uploads/${file.filename}`;
  }

  const publicId = `${folder}/${path.parse(file.filename).name}`;
  const url = await uploadToCloudinary(file.path, { publicId });

  fs.unlink(file.path, (err) => {
    if (err) {
      console.error(
        "[ASIATECH SYNC] Failed to clean up local upload staging copy:",
        err.message,
      );
    }
  });

  return url;
}

const renameUpload = async (file, name) => {
  if (!file || !name) return file;

  const safeName = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  if (!safeName) return file;

  const extension = path.extname(file.filename);
  const renamedFilename = `${safeName}${extension}`;
  const renamedPath = path.join(path.dirname(file.path), renamedFilename);
  if (renamedPath !== file.path) {
    await fs.promises.rm(renamedPath, { force: true });
    await fs.promises.rename(file.path, renamedPath);
    file.filename = renamedFilename;
    file.path = renamedPath;
  }
  return file;
};

module.exports = { persistUpload, renameUpload };
