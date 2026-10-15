const express = require("express");
const { protect, authorize, authorizeFullAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const SiteSetting = require("../models/SiteSetting");

const router = express.Router();

// @route   GET /api/site-settings
// @desc    Public: current customizable site content.
router.get("/", async (req, res) => {
  try {
    const [imageDoc, sizeDoc] = await Promise.all([
      SiteSetting.findOne({ key: "aboutImage" }),
      SiteSetting.findOne({ key: "aboutImageSize" }),
    ]);
    return res.json({
      aboutImage: imageDoc?.value || "",
      aboutImageSize: sizeDoc?.value || "md",
    });
  } catch (err) {
    return res.status(400).json({ message: "Failed to load site settings." });
  }
});

// @route   POST /api/site-settings/admin/upload
// @desc    Full admin uploads an image (local storage) -> { url }.
router.post(
  "/admin/upload",
  protect,
  authorize("admin"),
  authorizeFullAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Choose an image first." });
      }
      return res.json({ url: req.file.path });
    } catch (err) {
      return res.status(400).json({ message: "Failed to upload the image." });
    }
  },
);

// @route   PUT /api/site-settings/admin
// @desc    Full admin sets the About-section image (url or "" to clear).
router.put(
  "/admin",
  protect,
  authorize("admin"),
  authorizeFullAdmin,
  async (req, res) => {
    try {
      const value = (req.body.aboutImage || "").trim();
      await SiteSetting.findOneAndUpdate(
        { key: "aboutImage" },
        { value },
        { upsert: true, new: true },
      );
      const size = ["sm", "md", "lg"].includes(req.body.aboutImageSize)
        ? req.body.aboutImageSize
        : "md";
      await SiteSetting.findOneAndUpdate(
        { key: "aboutImageSize" },
        { value: size },
        { upsert: true, new: true },
      );
      return res.json({ aboutImage: value, aboutImageSize: size });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Failed to save the site settings." });
    }
  },
);

module.exports = router;
