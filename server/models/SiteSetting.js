const mongoose = require("mongoose");

// Simple key/value store for admin-customizable site content
// (e.g. the About-section image on the landing page).
const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
