const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Offer name is required"],
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["Category", "Specific Products", "Brands", "All products"],
      required: true,
      default: "Category",
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Flat Discount"],
      default: "Percentage",
    },
    discountValue: {
      type: Number,
      required: [true, "Discount percentage/value is required"],
      min: [0, "Discount cannot be negative"],
    },
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableBrands: [
      {
        type: String,
        trim: true,
      },
    ],
    startDate: {
      type: Date,
      required: [true, "Valid from date is required"],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, "Valid to date is required"],
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
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
