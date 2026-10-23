const mongoose = require("mongoose");

// A post on the landing-page billboard (school announcement or company ad).
// Only full admins can create or delete these.
const billboardPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    caption: { type: String, trim: true, maxlength: 400, default: "" },
    category: {
      type: String,
      enum: ["school", "company"],
      required: true,
    },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BillboardPost", billboardPostSchema);
