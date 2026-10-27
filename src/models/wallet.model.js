const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      default: () => "TXN-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000),
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    description: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: [
        "cancellation_refund",
        "return_refund",
        "order_payment",
        "referral_bonus",
        "admin_adjustment",
        "wallet_topup",
      ],
      default: "admin_adjustment",
    },
    orderId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
    },
    transactions: [walletTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
