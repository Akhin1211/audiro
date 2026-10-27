const express = require("express");
const {
  createCodOrder,
  initiatePayPalOrder,
  capturePayPalPayment,
  initiateRazorpayOrder,
  verifyRazorpayPayment,
  recordPaymentFailure,
  retryPayment,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  returnOrderItem,
  downloadInvoice,
} = require("../controllers/order.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();

router.use(authMiddleware);

// Checkout & Payment
router.post("/", createCodOrder);
// PayPal Payment Endpoints
router.post("/paypal/create-order", initiatePayPalOrder);
router.post("/paypal/capture-payment", capturePayPalPayment);
router.post("/paypal/payment-failed", recordPaymentFailure);
// Legacy compatibility
router.post("/razorpay/create-order", initiatePayPalOrder);
router.post("/razorpay/verify-payment", capturePayPalPayment);
router.post("/razorpay/payment-failed", recordPaymentFailure);
router.post("/:orderId/retry-payment", retryPayment);

// Order Listing & Details
router.get("/", getUserOrders);
router.get("/:orderId", getOrderDetails);

// Invoice Download
router.get("/:orderId/invoice", downloadInvoice);

// Cancellations
router.patch("/:orderId/cancel", cancelOrder);
router.patch("/:orderId/items/:itemId/cancel", cancelOrderItem);

// Returns (Customer requests return)
router.patch("/:orderId/return", returnOrder);
router.patch("/:orderId/items/:itemId/return", returnOrderItem);

module.exports = router;
