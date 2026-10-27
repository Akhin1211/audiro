const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "",
  },
  storage: {
    type: String,
    default: "",
  },
  sku: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  originalPrice: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  lineTotal: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Placed", "Cancelled", "Returned"],
    default: "Placed",
  },
  cancellationReason: {
    type: String,
    default: "",
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  returnReason: {
    type: String,
    default: "",
  },
  returnedAt: {
    type: Date,
    default: null,
  },
  returnRequest: {
    status: {
      type: String,
      enum: ["None", "Requested", "Approved", "Rejected"],
      default: "None",
    },
    reason: { type: String, default: "" },
    requestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
  },
  stockRestored: {
    type: Boolean,
    default: false,
  },
});

const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine: { type: String, required: true },
  addressLine2: { type: String, default: "" },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  addressLabel: { type: String, default: "Home" },
});

const orderPricingSchema = new mongoose.Schema({
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  couponDiscount: { type: Number, default: 0 },
  couponCode: { type: String, default: "" },
  offerDiscount: { type: Number, default: 0 },
  walletDeduction: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    pricing: orderPricingSchema,
    paymentMethod: {
      type: String,
      enum: ["COD", "PayPal", "Wallet", "PayPal+Wallet", "Razorpay", "Razorpay+Wallet"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    paypalOrderId: {
      type: String,
      default: "",
    },
    paypalPayerId: {
      type: String,
      default: "",
    },
    paypalCaptureId: {
      type: String,
      default: "",
    },
    razorpayOrderId: {
      type: String,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    razorpaySignature: {
      type: String,
      default: "",
    },
    walletAmountPaid: {
      type: Number,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Confirmed",
      index: true,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    returnRequest: {
      status: {
        type: String,
        enum: ["None", "Requested", "Approved", "Rejected"],
        default: "None",
      },
      reason: { type: String, default: "" },
      requestedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      adminComment: { type: String, default: "" },
    },
    refundDetails: {
      isRefunded: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      refundedTo: { type: String, default: "Wallet" },
      transactionId: { type: String, default: "" },
      refundedAt: { type: Date, default: null },
    },
    returnReason: {
      type: String,
      default: "",
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    isStockRestored: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
