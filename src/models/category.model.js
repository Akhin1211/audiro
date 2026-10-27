const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    nameLower: {
      type: String,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure case-insensitive comparison helper field nameLower is set
categorySchema.pre("save", function () {
  if (this.isModified("name")) {
    this.nameLower = this.name.toLowerCase();
  }
});

module.exports = mongoose.model("Category", categorySchema);
