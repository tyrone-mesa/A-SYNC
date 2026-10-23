const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const {
  protect,
  authorize,
  authorizeFullAdmin,
} = require("../middleware/auth");
const BillboardPost = require("../models/BillboardPost");
const { persistUpload } = require("../utils/persistUpload");
const { removeFile } = require("../utils/storage");

const router = express.Router();

// ============================================================
// UPLOAD CONFIG
// Any common picture format a browser can display, up to 50 MB.
// SVG is intentionally excluded (it can carry scripts), and
// HEIC/TIFF are excluded because browsers cannot show them.
// ============================================================
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
]);

const billboardDir = path.join(__dirname, "..", "uploads", "billboard");
if (!fs.existsSync(billboardDir)) {
  fs.mkdirSync(billboardDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    file.uploadFolder = "billboard";
    cb(null, billboardDir);
  },
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `billboard-${suffix}${path.extname(file.originalname).toLowerCase()}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) return cb(null, true);
    cb(
      new Error(
        "Unsupported image type. Use JPG, PNG, GIF, WEBP, AVIF or BMP.",
      ),
    );
  },
});

// Multer errors need a billboard-specific message (the global handler
// says "5 MB"), so the upload is wrapped here.
const receiveImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ message: "Image is too large. Maximum size is 50 MB." });
    }
    return res
      .status(400)
      .json({ message: err.message || "Failed to upload the image." });
  });
};

// Checks the real file signature, not just the extension.
const looksLikeImage = (filePath) => {
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    const startsWith = (...bytes) => bytes.every((b, i) => buf[i] === b);
    if (startsWith(0xff, 0xd8, 0xff)) return true; // JPEG
    if (startsWith(0x89, 0x50, 0x4e, 0x47)) return true; // PNG
    if (buf.toString("ascii", 0, 4) === "GIF8") return true; // GIF
    if (startsWith(0x42, 0x4d)) return true; // BMP
    if (
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP"
    ) {
      return true; // WEBP
    }
    if (
      buf.toString("ascii", 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(buf.toString("ascii", 8, 12))
    ) {
      return true; // AVIF
    }
    return false;
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};

const discard = (file) => {
  if (file?.path && !/^https?:\/\//i.test(file.path)) {
    fs.unlink(file.path, () => {});
  }
};

// @route   GET /api/billboard
// @desc    Public: billboard posts, newest first.
router.get("/", async (req, res) => {
  try {
    const posts = await BillboardPost.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .select("title caption category imageUrl linkUrl createdAt");
    return res.json({ posts });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load the billboard." });
  }
});

// @route   POST /api/billboard/admin
// @desc    Full admin posts an announcement / advertisement (multipart:
//          image, title, caption?, category, linkUrl?).
router.post(
  "/admin",
  protect,
  authorize("admin"),
  authorizeFullAdmin,
  receiveImage,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Choose an image first." });
      }

      const title = String(req.body.title || "").trim();
      const caption = String(req.body.caption || "").trim();
      const category = String(req.body.category || "").trim();
      const linkUrl = String(req.body.linkUrl || "").trim();

      let problem = "";
      if (title.length < 3 || title.length > 120) {
        problem = "Title must be 3 to 120 characters.";
      } else if (caption.length > 400) {
        problem = "Caption must be 400 characters or fewer.";
      } else if (!["school", "company"].includes(category)) {
        problem = "Choose School Announcement or Company Advertisement.";
      } else if (linkUrl && !/^https?:\/\/\S+$/i.test(linkUrl)) {
        problem = "The link must start with http:// or https://";
      } else if (!looksLikeImage(req.file.path)) {
        problem = "That file is not a valid picture.";
      }

      if (problem) {
        discard(req.file);
        return res.status(400).json({ message: problem });
      }

      const imageUrl = await persistUpload(req.file, {
        folder: "asiatech-sync/billboard",
      });

      const post = await BillboardPost.create({
        title,
        caption,
        category,
        linkUrl,
        imageUrl,
        createdBy: req.user._id,
      });

      return res.status(201).json({ post });
    } catch (err) {
      discard(req.file);
      console.error("[ASIATECH SYNC] Billboard post failed:", err.message);
      return res.status(400).json({ message: "Failed to post to the billboard." });
    }
  },
);

// @route   DELETE /api/billboard/admin/:id
// @desc    Full admin deletes a post and its image.
router.delete(
  "/admin/:id",
  protect,
  authorize("admin"),
  authorizeFullAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ message: "Post not found." });
      }
      const post = await BillboardPost.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found." });
      }
      await removeFile(post.imageUrl);
      await post.deleteOne();
      return res.json({ message: "Post deleted." });
    } catch (err) {
      return res.status(400).json({ message: "Failed to delete the post." });
    }
  },
);

module.exports = router;
