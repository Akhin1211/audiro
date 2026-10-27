const {
  createCodOrderService,
  initiatePayPalOrderService,
  capturePayPalPaymentService,
  initiateRazorpayOrderService,
  verifyRazorpayPaymentService,
  recordPaymentFailureService,
  retryPaymentService,
  getUserOrdersService,
  getOrderDetailsService,
  cancelOrderService,
  cancelOrderItemService,
  returnOrderService,
  returnOrderItemService,
  adminReviewReturnRequestService,
  updateOrderStatusService,
  generateOrderInvoicePDF,
  getAdminOrdersService,
  getAdminReturnsService,
  getAdminOrderDetailsService,
  updateOrderStatusByAdminService,
  updateProductStockByAdminService,
} = require("../services/order.service.js");

// COD / Wallet full checkout
const createCodOrder = async (req, res) => {
  try {
    const { addressId, couponCode, useWallet } = req.body;
    const order = await createCodOrderService(req.userId, {
      addressId,
      couponCode,
      useWallet,
    });
    res.status(201).json({
      message:
        order.paymentMethod === "Wallet"
          ? "Order placed successfully using Wallet"
          : "Order placed successfully using Cash on Delivery",
      order,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Initiate PayPal checkout order
const initiatePayPalOrder = async (req, res) => {
  try {
    const { addressId, couponCode, useWallet } = req.body;
    const result = await initiatePayPalOrderService(req.userId, {
      addressId,
      couponCode,
      useWallet,
    });

    if (result.completed) {
      return res.status(201).json({
        message: "Order placed successfully using Wallet balance",
        completed: true,
        order: result.order,
      });
    }

    res.status(200).json({
      completed: false,
      order: result.order,
      paypalOrder: result.paypalOrder,
      clientId: result.clientId,
      currency: result.currency,
      amountInInr: result.amountInInr,
      amountInPayPal: result.amountInPayPal,
      // Compatibility aliases
      razorpayOrder: result.razorpayOrder,
      keyId: result.clientId,
      amount: result.amount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Capture / Verify PayPal payment
const capturePayPalPayment = async (req, res) => {
  try {
    const { orderId, paypalOrderId, payerId, razorpayOrderId } = req.body;
    const order = await capturePayPalPaymentService(req.userId, {
      orderId,
      paypalOrderId: paypalOrderId || razorpayOrderId,
      payerId,
    });

    res.status(200).json({
      message: "PayPal payment captured successfully",
      order,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Legacy Razorpay aliases forwarding to PayPal
const initiateRazorpayOrder = initiatePayPalOrder;
const verifyRazorpayPayment = capturePayPalPayment;

// Record Razorpay payment failure
const recordPaymentFailure = async (req, res) => {
  try {
    const { orderId, errorDescription } = req.body;
    const order = await recordPaymentFailureService(req.userId, {
      orderId,
      errorDescription,
    });
    res.status(200).json({
      message: "Payment failure recorded",
      order,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Retry Payment
const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await retryPaymentService(req.userId, orderId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const result = await getUserOrdersService(req.userId, {
      search,
      page,
      limit,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderDetailsService(req.userId, orderId);
    res.status(200).json({ order });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await cancelOrderService(req.userId, orderId, reason);
    res.status(200).json({
      message: "Order cancelled successfully and stock restored",
      order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message });
  }
};

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const order = await cancelOrderItemService(
      req.userId,
      orderId,
      itemId,
      reason
    );
    res.status(200).json({
      message: "Item cancelled successfully and stock restored",
      order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Return reason is mandatory" });
    }
    const order = await returnOrderService(req.userId, orderId, reason);
    res.status(200).json({
      message: "Return request submitted successfully. Awaiting admin review.",
      order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message });
  }
};

const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Return reason is mandatory" });
    }
    const order = await returnOrderItemService(
      req.userId,
      orderId,
      itemId,
      reason
    );
    res.status(200).json({
      message: "Item return request submitted successfully. Awaiting admin review.",
      order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderDetailsService(req.userId, orderId);
    await generateOrderInvoicePDF(order, res);
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const order = await updateOrderStatusService(orderId, status);
    res.status(200).json({
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin Controllers
const getAdminOrders = async (req, res) => {
  try {
    const { search, status, startDate, endDate, sort, page, limit } = req.query;
    const result = await getAdminOrdersService({
      search,
      status,
      startDate,
      endDate,
      sort,
      page,
      limit,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getAdminOrderDetailsService(orderId);
    res.status(200).json({ order });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const updateAdminOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;
    const order = await updateOrderStatusByAdminService(orderId, status, reason);
    res.status(200).json({
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin Review Customer Return Request (Approve & Refund to Wallet / Reject)
const adminReviewReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, comment } = req.body;
    const order = await adminReviewReturnRequestService(orderId, {
      action,
      comment,
    });
    res.status(200).json({
      message:
        action === "Approve"
          ? "Return approved! Stock restored and funds refunded to customer's wallet."
          : "Return request rejected.",
      order,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const downloadAdminInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getAdminOrderDetailsService(orderId);
    await generateOrderInvoicePDF(order, res);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// Admin Returns & Refunds listing
const getAdminReturns = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await getAdminReturnsService({ search, status, page, limit });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;
    const product = await updateProductStockByAdminService(productId, stock);
    res.status(200).json({
      message: "Product stock updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
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
  adminReviewReturnRequest,
  getAdminReturns,
  downloadInvoice,
  updateOrderStatus,
  getAdminOrders,
  getAdminOrderDetails,
  updateAdminOrderStatus,
  downloadAdminInvoice,
  updateProductStock,
};
