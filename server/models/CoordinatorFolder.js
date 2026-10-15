const mongoose = require("mongoose");

// A private, named folder a coordinator uses to group students (e.g. "Batch A — Cebu
// placements"). Folders belong to exactly one coordinator and are never visible to anyone else.
const CoordinatorFolderSchema = new mongoose.Schema(
  {
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudentProfile" }],
  },
  { timestamps: true },
);

// Folder names are unique per coordinator, ignoring letter case ("batch a" == "Batch A").
CoordinatorFolderSchema.index(
  { coordinator: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

module.exports = mongoose.model("CoordinatorFolder", CoordinatorFolderSchema);
