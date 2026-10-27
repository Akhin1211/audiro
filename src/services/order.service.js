const Product = require("../models/product.model.js");
const Cart = require("../models/cart.model.js");
const User = require("../models/user.model.js");
const Order = require("../models/order.model.js");
const PDFDocument = require("pdfkit");
const {
  createOrder,
  findOrderById,
  findOrderByOrderId,
  findOrdersByUserId,
  countOrdersByUserId,
  updateOrderById,
  findAdminOrders,
  countAdminOrders,
} = require("../repositories/order.repository.js");

const { findActiveOffers } = require("../repositories/offer.repository.js");
const { calculateBestProductOffer } = require("./offer.service.js");
const {
  validateAndApplyCouponService,
  incrementCouponUsage,
} = require("./coupon.service.js");
const {
  getUserWalletService,
  creditUserWalletService,
  debitUserWalletService,
} = require("./wallet.service.js");
const {
  createPayPalOrder,
  capturePayPalOrder,
  paypalClientId,
  paypalCurrency,
  paypalMode,
  convertToPayPalAmount,
} = require("./payment.service.js");

const generateOrderId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
};

// Check & reward referrer upon first completed order
const checkAndApplyReferralReward = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referredBy) return;

    // Check count of orders for this user
    const completedCount = await Order.countDocuments({
      user: userId,
      paymentStatus: "Completed",
    });

    // If this is the user's first completed order, award ₹200 to referrer
    if (completedCount === 1) {
      await creditUserWalletService(
        user.referredBy,
        200,
        `Referral bonus for inviting ${user.username || "a new customer"}`,
        "referral_bonus"
      );
    }
  } catch (err) {
    console.error("Referral bonus processing notice:", err.message);
  }
};

// Reusable calculation helper for cart, active offers, coupon, and wallet deduction
const calculateOrderDetails = async (
  userId,
  { addressId, couponCode = "", useWallet = false }
) => {
  if (!addressId) {
    throw new Error("Shipping address is required to place an order.");
  }

  // 1. Fetch user & address
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User account not found.");
  }

  const selectedAddress = user.addresses.id(addressId);
  if (!selectedAddress) {
    throw new Error("Selected shipping address could not be found.");
  }

  // 2. Fetch cart
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new Error("Cannot place an order with an empty cart.");
  }

  // 3. Fetch active promotional offers
  let activeOffers = [];
  try {
    activeOffers = await findActiveOffers();
  } catch (e) {
    activeOffers = [];
  }

  // 4. Validate every product, stock, and calculate prices considering offers
  let subtotal = 0;
  let discountTotal = 0;
  let offerDiscount = 0;
  const orderItems = [];

  for (const item of cart.items) {
    if (!item.product) {
      throw new Error("A product in your cart is no longer available.");
    }

    const product = await Product.findById(item.product._id);
    if (!product || !product.isActive || product.isDeleted) {
      throw new Error(
        `Product "${item.product.name || "Item"}" is currently unlisted or unavailable.`
      );
    }

    let availableStock = product.stock;
    let originalPrice = product.price;
    let basePrice = product.discountPrice > 0 ? product.discountPrice : product.price;
    let itemImage = (product.images && product.images[0]) || "";
    let itemStorage = item.storage || "";
    let itemSku = "";

    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.id(item.variantId);
      if (variant && !variant.isDeleted) {
        availableStock = variant.stock;
        originalPrice = variant.price;
        basePrice = variant.discountPrice > 0 ? variant.discountPrice : variant.price;
        if (variant.images && variant.images.length > 0) {
          itemImage = variant.images[0];
        }
        itemSku = variant.sku || "";
        itemStorage = variant.storage || itemStorage;
      }
    }

    if (availableStock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${availableStock}, requested: ${item.quantity}.`
      );
    }

    // Apply best promotional offer ("largest between product and category offer")
    let itemPrice = basePrice;
    const offerResult = calculateBestProductOffer(product, activeOffers);
    if (offerResult && offerResult.discountAmount > 0) {
      if (offerResult.finalPrice < itemPrice) {
        const itemOfferDiff = (itemPrice - offerResult.finalPrice) * item.quantity;
        offerDiscount += itemOfferDiff;
        itemPrice = offerResult.finalPrice;
      }
    }

    const lineTotal = itemPrice * item.quantity;
    subtotal += lineTotal;

    if (originalPrice > itemPrice) {
      discountTotal += (originalPrice - itemPrice) * item.quantity;
    }

    orderItems.push({
      product: product._id,
      variantId: item.variantId || null,
      name: product.name,
      brand: product.brand || "",
      image: itemImage,
      color: item.color || "",
      storage: itemStorage,
      sku: itemSku,
      price: itemPrice,
      originalPrice,
      quantity: item.quantity,
      lineTotal,
      status: "Placed",
      stockRestored: false,
    });
  }

  // 5. Coupon validation & application
  let couponDiscount = 0;
  let validCouponCode = "";
  if (couponCode && couponCode.trim()) {
    const couponRes = await validateAndApplyCouponService({
      code: couponCode.trim(),
      subtotal,
      userId,
    });
    couponDiscount = couponRes.discountAmount;
    validCouponCode = couponRes.code;
  }

  // 6. Delivery charge & tax
  const deliveryCharge = subtotal > 500 ? 0 : 40;
  const taxableBase = Math.max(0, subtotal - couponDiscount);
  const tax = Math.round(taxableBase * 0.05); // 5% tax
  const totalBeforeWallet = Math.max(0, taxableBase + deliveryCharge + tax);

  // 7. Wallet deduction calculation
  let walletDeduction = 0;
  let userWallet = null;
  if (useWallet) {
    userWallet = await getUserWalletService(userId);
    if (userWallet && userWallet.balance > 0) {
      walletDeduction = Math.min(userWallet.balance, totalBeforeWallet);
    }
  }

  const finalPayable = Math.max(0, totalBeforeWallet - walletDeduction);

  return {
    user,
    selectedAddress,
    orderItems,
    pricing: {
      subtotal,
      discountTotal,
      couponDiscount,
      couponCode: validCouponCode,
      offerDiscount,
      walletDeduction,
      deliveryCharge,
      tax,
      finalTotal: totalBeforeWallet,
    },
    finalPayable,
    walletDeduction,
  };
};

// Safe atomic stock reservation with rollback support for multi-item checkout
const reserveStockForItems = async (orderItems) => {
  const reservedItems = [];

  try {
    for (const item of orderItems) {
      const productId = item.product?._id || item.product;
      let updated = null;

      if (item.variantId) {
        updated = await Product.findOneAndUpdate(
          {
            _id: productId,
            stock: { $gte: item.quantity },
            "variants._id": item.variantId,
            "variants.stock": { $gte: item.quantity },
          },
          {
            $inc: {
              stock: -item.quantity,
              "variants.$.stock": -item.quantity,
            },
          },
          { returnDocument: "after" }
        );
      } else {
        updated = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: "after" }
        );
      }

      if (!updated) {
        throw new Error(
          `Insufficient stock for "${item.name}". Stock was claimed by another customer.`
        );
      }

      reservedItems.push(item);
    }
  } catch (error) {
    // Rollback any stock decremented before failure
    for (const item of reservedItems) {
      try {
        const productId = item.product?._id || item.product;
        if (item.variantId) {
          await Product.updateOne(
            { _id: productId, "variants._id": item.variantId },
            { $inc: { stock: item.quantity, "variants.$.stock": item.quantity } }
          );
        } else {
          await Product.updateOne(
            { _id: productId },
            { $inc: { stock: item.quantity } }
          );
        }
      } catch (rollbackErr) {
        console.error("Stock rollback error for item:", item.name, rollbackErr.message);
      }
    }
    throw error;
  }
};

// Cash on Delivery Order Creation
const createCodOrderService = async (
  userId,
  { addressId, couponCode = "", useWallet = false }
) => {
  const {
    user,
    selectedAddress,
    orderItems,
    pricing,
    finalPayable,
    walletDeduction,
  } = await calculateOrderDetails(userId, { addressId, couponCode, useWallet });

  // If wallet deduction applies, debit wallet now
  if (walletDeduction > 0) {
    await debitUserWalletService(
      userId,
      walletDeduction,
      `Partial wallet payment for order`,
      ""
    );
  }

  // Stock deduction safely with rollback on failure
  try {
    await reserveStockForItems(orderItems);
  } catch (stockError) {
    if (walletDeduction > 0) {
      try {
        await creditUserWalletService(
          userId,
          walletDeduction,
          "Refund for failed checkout stock reservation",
          "order_refund"
        );
      } catch (refundErr) {
        console.error("Wallet refund error upon checkout failure:", refundErr.message);
      }
    }
    throw stockError;
  }

  const orderId = generateOrderId();
  const paymentMethod =
    finalPayable === 0 ? "Wallet" : walletDeduction > 0 ? "COD" : "COD";
  const paymentStatus = finalPayable === 0 ? "Completed" : "Pending";

  const newOrder = await createOrder({
    orderId,
    user: userId,
    items: orderItems,
    shippingAddress: {
      name: selectedAddress.name,
      phone: selectedAddress.phone,
      addressLine: selectedAddress.addressLine,
      addressLine2: selectedAddress.addressLine2 || "",
      city: selectedAddress.city,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
      addressLabel: selectedAddress.addressLabel || "Home",
    },
    pricing,
    paymentMethod,
    paymentStatus,
    walletAmountPaid: walletDeduction,
    orderStatus: "Confirmed",
  });

  // Clear cart
  await Cart.findOneAndUpdate({ user: userId }, { items: [] });

  // Increment coupon usage if applied
  if (pricing.couponCode) {
    try {
      await incrementCouponUsage(pricing.couponCode, userId);
    } catch (e) {}
  }

  // Check referral bonus if wallet covered 100%
  if (paymentStatus === "Completed") {
    await checkAndApplyReferralReward(userId);
  }

  return newOrder;
};

// Initiate PayPal Order
const initiatePayPalOrderService = async (
  userId,
  { addressId, couponCode = "", useWallet = false }
) => {
  const {
    user,
    selectedAddress,
    orderItems,
    pricing,
    finalPayable,
    walletDeduction,
  } = await calculateOrderDetails(userId, { addressId, couponCode, useWallet });

  // If payable amount is 0 (wallet covered 100% of order)
  if (finalPayable === 0) {
    // Deduct from wallet
    await debitUserWalletService(
      userId,
      walletDeduction,
      `Full wallet payment for order`,
      ""
    );

    // Reduce stock atomically with rollback
    try {
      await reserveStockForItems(orderItems);
    } catch (stockError) {
      try {
        await creditUserWalletService(
          userId,
          walletDeduction,
          "Refund for failed wallet checkout stock reservation",
          "order_refund"
        );
      } catch (refundErr) {
        console.error("Wallet refund error upon checkout failure:", refundErr.message);
      }
      throw stockError;
    }

    const orderId = generateOrderId();
    const newOrder = await createOrder({
      orderId,
      user: userId,
      items: orderItems,
      shippingAddress: {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        addressLine: selectedAddress.addressLine,
        addressLine2: selectedAddress.addressLine2 || "",
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        addressLabel: selectedAddress.addressLabel || "Home",
      },
      pricing,
      paymentMethod: "Wallet",
      paymentStatus: "Completed",
      walletAmountPaid: walletDeduction,
      orderStatus: "Confirmed",
    });

    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    if (pricing.couponCode) {
      try {
        await incrementCouponUsage(pricing.couponCode, userId);
      } catch (e) {}
    }
    await checkAndApplyReferralReward(userId);

    return {
      completed: true,
      order: newOrder,
    };
  }

  // Online PayPal Payment required
  const orderId = generateOrderId();
  const paypalOrder = await createPayPalOrder({
    amount: finalPayable,
    receipt: orderId,
    description: `AUDIRO Order #${orderId}`,
  });

  // Create order in Pending status
  const pendingOrder = await createOrder({
    orderId,
    user: userId,
    items: orderItems,
    shippingAddress: {
      name: selectedAddress.name,
      phone: selectedAddress.phone,
      addressLine: selectedAddress.addressLine,
      addressLine2: selectedAddress.addressLine2 || "",
      city: selectedAddress.city,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
      addressLabel: selectedAddress.addressLabel || "Home",
    },
    pricing,
    paymentMethod: walletDeduction > 0 ? "PayPal+Wallet" : "PayPal",
    paymentStatus: "Pending",
    paypalOrderId: paypalOrder.id,
    walletAmountPaid: walletDeduction,
    orderStatus: "Pending",
  });

  return {
    completed: false,
    order: pendingOrder,
    paypalOrder,
    clientId: paypalClientId,
    currency: paypalCurrency,
    amountInInr: finalPayable,
    amountInPayPal: paypalOrder.amount,
    // Backwards compatibility aliases for client
    razorpayOrder: {
      id: paypalOrder.id,
      amount: paypalOrder.amount,
      currency: paypalCurrency,
    },
    keyId: paypalClientId,
    amount: finalPayable,
  };
};

// Capture / Verify PayPal Payment
const capturePayPalPaymentService = async (
  userId,
  { orderId, paypalOrderId, payerId }
) => {
  let order = await Order.findOne({
    $or: [
      { orderId },
      { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null },
    ],
  });

  if (!order) {
    throw new Error("Order not found for payment capture");
  }

  if (order.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized order capture");
  }

  if (order.paymentStatus === "Completed") {
    return order;
  }

  const effectivePayPalOrderId =
    paypalOrderId || order.paypalOrderId || order.razorpayOrderId;

  // Execute PayPal capture
  let captureResult = null;
  try {
    captureResult = await capturePayPalOrder(effectivePayPalOrderId);
  } catch (err) {
    order.paymentStatus = "Failed";
    await order.save();
    throw new Error(`PayPal payment capture failed: ${err.message}`);
  }

  // Deduct wallet if split payment
  if (order.walletAmountPaid > 0) {
    try {
      await debitUserWalletService(
        userId,
        order.walletAmountPaid,
        `Wallet portion for order #${order.orderId}`,
        order.orderId
      );
    } catch (e) {
      console.warn("Wallet split deduction note:", e.message);
    }
  }

  // Deduct stock for all items safely
  await reserveStockForItems(order.items);

  order.paymentStatus = "Completed";
  order.orderStatus = "Confirmed";
  order.paypalOrderId = effectivePayPalOrderId;
  order.paypalCaptureId = captureResult?.id || "";
  order.paypalPayerId = payerId || captureResult?.payer?.payer_id || "";
  await order.save();

  // Clear cart
  await Cart.findOneAndUpdate({ user: userId }, { items: [] });

  // Increment coupon usage
  if (order.pricing?.couponCode) {
    try {
      await incrementCouponUsage(order.pricing.couponCode, userId);
    } catch (e) {}
  }

  // Check referral bonus
  await checkAndApplyReferralReward(userId);

  return order;
};

// Record Payment Failure
const recordPaymentFailureService = async (
  userId,
  { orderId, errorDescription = "" }
) => {
  let order = await Order.findOne({
    $or: [
      { orderId },
      { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null },
    ],
  });

  if (!order) {
    throw new Error("Order not found");
  }

  order.paymentStatus = "Failed";
  await order.save();
  return order;
};

// Retry Payment for Failed / Pending Orders using PayPal
const retryPaymentService = async (userId, orderIdentifier) => {
  let order = await Order.findOne({
    $or: [
      { orderId: orderIdentifier },
      { _id: orderIdentifier.match(/^[0-9a-fA-F]{24}$/) ? orderIdentifier : null },
    ],
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  if (order.paymentStatus === "Completed") {
    throw new Error("This order is already paid.");
  }

  // Check stock availability before retrying
  for (const item of order.items) {
    const prod = await Product.findById(item.product);
    if (!prod || prod.stock < item.quantity) {
      throw new Error(`Insufficient stock to retry order for "${item.name}".`);
    }
  }

  const payableAmount = Math.max(
    0,
    order.pricing.finalTotal - (order.walletAmountPaid || 0)
  );

  const paypalOrder = await createPayPalOrder({
    amount: payableAmount,
    receipt: order.orderId,
    description: `Retry Payment for Order #${order.orderId}`,
  });

  order.paypalOrderId = paypalOrder.id;
  await order.save();

  return {
    order,
    paypalOrder,
    clientId: paypalClientId,
    currency: paypalCurrency,
    amountInInr: payableAmount,
    amountInPayPal: paypalOrder.amount,
    // Backwards compatibility alias
    razorpayOrder: {
      id: paypalOrder.id,
      amount: paypalOrder.amount,
      currency: paypalCurrency,
    },
    keyId: paypalClientId,
    amount: payableAmount,
  };
};

// Aliases for compatibility
const initiateRazorpayOrderService = initiatePayPalOrderService;
const verifyRazorpayPaymentService = capturePayPalPaymentService;

const getUserOrdersService = async (
  userId,
  { search = "", page = 1, limit = 10 } = {}
) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalOrders] = await Promise.all([
    findOrdersByUserId(userId, {
      search,
      skip,
      limit: limitNum,
      sort: "-createdAt",
    }),
    countOrdersByUserId(userId, { search }),
  ]);

  return {
    orders,
    totalOrders,
    currentPage: pageNum,
    totalPages: Math.ceil(totalOrders / limitNum) || 1,
  };
};

const getOrderDetailsService = async (userId, orderIdentifier) => {
  let order;
  if (orderIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
    order = await findOrderById(orderIdentifier);
  }
  if (!order) {
    order = await findOrderByOrderId(orderIdentifier);
  }

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.user._id.toString() !== userId.toString()) {
    const error = new Error("Access denied. You can only view your own orders.");
    error.statusCode = 403;
    throw error;
  }

  return order;
};

// Cancel Entire Order with Instant Direct Refund to Wallet for Prepaid/Paid Orders
const cancelOrderService = async (userId, orderIdentifier, reason = "") => {
  const order = await getOrderDetailsService(userId, orderIdentifier);

  if (order.orderStatus === "Cancelled") {
    throw new Error("This order has already been cancelled.");
  }

  if (order.orderStatus === "Delivered") {
    throw new Error(
      "Delivered orders cannot be cancelled. You can request a return instead."
    );
  }

  if (order.orderStatus === "Returned") {
    throw new Error("This order has already been returned.");
  }

  // Restore product stock
  for (const item of order.items) {
    if (!item.stockRestored && item.status !== "Cancelled") {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
      if (item.variantId) {
        await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.quantity } }
        );
      }
      item.stockRestored = true;
      item.status = "Cancelled";
      item.cancellationReason = reason || "Order cancelled by customer";
      item.cancelledAt = new Date();
    }
  }

  // Automatic direct refund to wallet if paid online or via wallet
  const isPaid =
    order.paymentStatus === "Completed" ||
    order.paymentMethod === "Wallet" ||
    (order.walletAmountPaid && order.walletAmountPaid > 0);

  if (isPaid && !order.refundDetails?.isRefunded) {
    const refundAmount = order.pricing.finalTotal;
    if (refundAmount > 0) {
      const customerUserId = order.user?._id
        ? order.user._id.toString()
        : order.user.toString();

      await creditUserWalletService(
        customerUserId,
        refundAmount,
        `Refund for cancelled order #${order.orderId}`,
        "cancellation_refund",
        order.orderId
      );

      order.refundDetails = {
        isRefunded: true,
        amount: refundAmount,
        refundedTo: "Wallet",
        transactionId: `TXN-REF-${Date.now()}`,
        refundedAt: new Date(),
      };
    }
  }

  order.orderStatus = "Cancelled";
  order.cancellationReason = reason || "Order cancelled by customer";
  order.cancelledAt = new Date();
  order.isStockRestored = true;

  await order.save();
  return order;
};

// Cancel Single Order Item with Wallet Refund
const cancelOrderItemService = async (
  userId,
  orderIdentifier,
  itemId,
  reason = ""
) => {
  const order = await getOrderDetailsService(userId, orderIdentifier);

  if (order.orderStatus === "Cancelled") {
    throw new Error("This order is already cancelled.");
  }

  if (order.orderStatus === "Delivered") {
    throw new Error(
      "Cannot cancel an item from a delivered order. You can request a return instead."
    );
  }

  const item = order.items.id(itemId);
  if (!item) {
    throw new Error("Item not found in this order.");
  }

  if (item.status === "Cancelled") {
    throw new Error("This item has already been cancelled.");
  }

  // Restore stock
  if (!item.stockRestored) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
    if (item.variantId) {
      await Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    }
    item.stockRestored = true;
  }

  item.status = "Cancelled";
  item.cancellationReason = reason || "Item cancelled by customer";
  item.cancelledAt = new Date();

  // If order was paid, refund item value to wallet
  const isPaid =
    order.paymentStatus === "Completed" ||
    order.paymentMethod === "Wallet" ||
    (order.walletAmountPaid && order.walletAmountPaid > 0);

  if (isPaid && item.lineTotal > 0) {
    const customerUserId = order.user?._id
      ? order.user._id.toString()
      : order.user.toString();

    await creditUserWalletService(
      customerUserId,
      item.lineTotal,
      `Refund for cancelled item (${item.name}) in order #${order.orderId}`,
      "cancellation_refund",
      order.orderId
    );
  }

  const allCancelled = order.items.every((it) => it.status === "Cancelled");
  if (allCancelled) {
    order.orderStatus = "Cancelled";
    order.cancellationReason = "All items in order were cancelled";
    order.cancelledAt = new Date();
    order.isStockRestored = true;
  }

  await order.save();
  return order;
};

// Customer submits Return Request for Delivered Order (Requires Admin Approval)
const returnOrderService = async (userId, orderIdentifier, reason) => {
  if (!reason || !reason.trim()) {
    throw new Error("Return reason is mandatory.");
  }

  const order = await getOrderDetailsService(userId, orderIdentifier);

  if (order.orderStatus !== "Delivered") {
    throw new Error("Only delivered orders can be returned.");
  }

  if (order.orderStatus === "Returned") {
    throw new Error("This order has already been returned.");
  }

  if (order.returnRequest?.status === "Requested") {
    throw new Error("Return request is already pending admin verification.");
  }

  order.returnRequest = {
    status: "Requested",
    reason: reason.trim(),
    requestedAt: new Date(),
    adminComment: "",
  };

  for (const item of order.items) {
    if (item.status !== "Cancelled" && item.status !== "Returned") {
      item.returnRequest = {
        status: "Requested",
        reason: reason.trim(),
        requestedAt: new Date(),
      };
    }
  }

  await order.save();
  return order;
};

// Customer submits Return Request for Single Item
const returnOrderItemService = async (
  userId,
  orderIdentifier,
  itemId,
  reason
) => {
  if (!reason || !reason.trim()) {
    throw new Error("Return reason is mandatory.");
  }

  const order = await getOrderDetailsService(userId, orderIdentifier);

  if (order.orderStatus !== "Delivered") {
    throw new Error("Only delivered orders can be returned.");
  }

  const item = order.items.id(itemId);
  if (!item) {
    throw new Error("Item not found in this order.");
  }

  if (item.status === "Cancelled") {
    throw new Error("Cancelled items cannot be returned.");
  }

  if (item.status === "Returned") {
    throw new Error("This item has already been returned.");
  }

  item.returnRequest = {
    status: "Requested",
    reason: reason.trim(),
    requestedAt: new Date(),
  };

  order.returnRequest = {
    status: "Requested",
    reason: reason.trim(),
    requestedAt: new Date(),
    adminComment: "",
  };

  await order.save();
  return order;
};

// Admin Review Return Request (Approve -> restores stock + refunds to wallet; Reject -> adds comment)
const adminReviewReturnRequestService = async (
  orderIdentifier,
  { action, comment = "" }
) => {
  const allowedActions = ["Approve", "Reject"];
  if (!allowedActions.includes(action)) {
    throw new Error("Invalid action. Must be 'Approve' or 'Reject'");
  }

  const order = await getAdminOrderDetailsService(orderIdentifier);

  if (!order.returnRequest || order.returnRequest.status !== "Requested") {
    throw new Error("No pending return request found for this order.");
  }

  if (action === "Approve") {
    order.returnRequest.status = "Approved";
    order.returnRequest.reviewedAt = new Date();
    order.returnRequest.adminComment = comment || "Return approved by admin";
    order.orderStatus = "Returned";

    // Restore stock for items
    for (const item of order.items) {
      if (item.status !== "Cancelled" && !item.stockRestored) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
        if (item.variantId) {
          await Product.updateOne(
            { _id: item.product, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": item.quantity } }
          );
        }
        item.stockRestored = true;
        item.status = "Returned";
        if (item.returnRequest) {
          item.returnRequest.status = "Approved";
          item.returnRequest.reviewedAt = new Date();
        }
      }
    }

    // Refund order total to Customer's Wallet
    const refundAmount = order.pricing.finalTotal;
    if (refundAmount > 0) {
      const customerUserId = order.user?._id
        ? order.user._id.toString()
        : order.user.toString();

      await creditUserWalletService(
        customerUserId,
        refundAmount,
        `Refund for accepted return on order #${order.orderId}`,
        "return_refund",
        order.orderId
      );

      order.refundDetails = {
        isRefunded: true,
        amount: refundAmount,
        refundedTo: "Wallet",
        transactionId: `TXN-RET-${Date.now()}`,
        refundedAt: new Date(),
      };
    }
  } else {
    // Rejected
    order.returnRequest.status = "Rejected";
    order.returnRequest.reviewedAt = new Date();
    order.returnRequest.adminComment =
      comment || "Return request rejected by admin";

    for (const item of order.items) {
      if (item.returnRequest) {
        item.returnRequest.status = "Rejected";
        item.returnRequest.reviewedAt = new Date();
      }
    }
  }

  await order.save();
  return order;
};

const ORDER_STATUS_FLOW = {
  Pending: ["Confirmed", "Shipped", "Cancelled"],
  Confirmed: ["Shipped", "Out for Delivery", "Cancelled"],
  Shipped: ["Out for Delivery", "Delivered", "Cancelled"],
  "Out for Delivery": ["Delivered", "Cancelled"],
  Delivered: [], // Final status! Cannot be undone or reverted
  Cancelled: [], // Terminal status!
  Returned: [], // Terminal status!
};

// Admin status updater
const updateOrderStatusService = async (orderIdentifier, newStatus) => {
  let order;
  if (orderIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
    order = await findOrderById(orderIdentifier);
  }
  if (!order) {
    order = await findOrderByOrderId(orderIdentifier);
  }
  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.orderStatus === newStatus) {
    return order;
  }

  const allowedNext = ORDER_STATUS_FLOW[order.orderStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(
      `Cannot change order status from "${order.orderStatus}" to "${newStatus}". Order status can only advance forward and cannot be reverted.`
    );
  }

  order.orderStatus = newStatus;
  if (newStatus === "Delivered") {
    order.paymentStatus = "Completed";
  }
  await order.save();
  return order;
};

// PDF Invoice Generator
const generateOrderInvoicePDF = async (order, res) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order.orderId}.pdf`
  );

  doc.pipe(res);

  // 1. Header Banner
  doc.rect(40, 40, 515, 60).fill("#800020");
  doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("AUDIRO", 60, 55);
  doc.fontSize(10).font("Helvetica").text("Premium Mobile & Audio Experience", 60, 82);
  doc.fontSize(14).font("Helvetica-Bold").text("TAX INVOICE", 420, 62, { align: "right" });

  doc.moveDown(3);
  doc.fillColor("#222222");

  // 2. Order Metadata & Date
  const startY = 120;
  doc.fontSize(10).font("Helvetica-Bold").text("Invoice Details:", 40, startY);
  doc.font("Helvetica").text(`Order ID: ${order.orderId}`, 40, startY + 16);
  doc.text(
    `Order Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", {
      dateStyle: "long",
    })}`,
    40,
    startY + 30
  );
  doc.text(
    `Payment Method: ${order.paymentMethod} (${order.paymentStatus})`,
    40,
    startY + 44
  );
  doc.text(`Order Status: ${order.orderStatus}`, 40, startY + 58);

  // Customer / Shipping Address
  doc.font("Helvetica-Bold").text("Shipping Address:", 320, startY);
  doc.font("Helvetica").text(order.shippingAddress.name, 320, startY + 16);
  doc.text(`Phone: ${order.shippingAddress.phone}`, 320, startY + 30);
  doc.text(
    `${order.shippingAddress.addressLine}${
      order.shippingAddress.addressLine2
        ? ", " + order.shippingAddress.addressLine2
        : ""
    }`,
    320,
    startY + 44
  );
  doc.text(
    `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
    320,
    startY + 58
  );

  doc.moveDown(5);

  // 3. Items Table Header
  const tableTop = 210;
  doc.rect(40, tableTop, 515, 24).fill("#f3f4f6");
  doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold");
  doc.text("ITEM DESCRIPTION", 50, tableTop + 7);
  doc.text("COLOR", 260, tableTop + 7);
  doc.text("QTY", 330, tableTop + 7);
  doc.text("UNIT PRICE", 380, tableTop + 7);
  doc.text("TOTAL", 480, tableTop + 7, { align: "right" });

  let curY = tableTop + 24;
  doc.font("Helvetica").fontSize(9).fillColor("#1f2937");

  order.items.forEach((item, index) => {
    const isAlt = index % 2 === 1;
    if (isAlt) {
      doc.rect(40, curY, 515, 22).fill("#fafafa");
      doc.fillColor("#1f2937");
    }

    doc.text(item.name.substring(0, 35), 50, curY + 6);
    doc.text(item.color || "Default", 260, curY + 6);
    doc.text(item.quantity.toString(), 330, curY + 6);
    doc.text(`INR ${item.price.toLocaleString("en-IN")}`, 380, curY + 6);
    doc.text(`INR ${item.lineTotal.toLocaleString("en-IN")}`, 480, curY + 6, {
      align: "right",
    });

    curY += 22;
  });

  doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(40, curY).lineTo(555, curY).stroke();

  // 4. Pricing Summary
  curY += 15;
  const summaryX = 350;
  const valueX = 480;

  doc.fontSize(9).fillColor("#4b5563");
  doc.text("Subtotal:", summaryX, curY);
  doc.text(`INR ${order.pricing.subtotal.toLocaleString("en-IN")}`, valueX, curY, {
    align: "right",
  });

  if (order.pricing.discountTotal > 0) {
    curY += 15;
    doc.text("Product Discount:", summaryX, curY);
    doc.text(
      `-INR ${order.pricing.discountTotal.toLocaleString("en-IN")}`,
      valueX,
      curY,
      { align: "right" }
    );
  }

  if (order.pricing.offerDiscount > 0) {
    curY += 15;
    doc.text("Offer Savings:", summaryX, curY);
    doc.text(
      `-INR ${order.pricing.offerDiscount.toLocaleString("en-IN")}`,
      valueX,
      curY,
      { align: "right" }
    );
  }

  if (order.pricing.couponDiscount > 0) {
    curY += 15;
    doc.text(
      `Coupon Savings (${order.pricing.couponCode || "DISC"}):`,
      summaryX,
      curY
    );
    doc.text(
      `-INR ${order.pricing.couponDiscount.toLocaleString("en-IN")}`,
      valueX,
      curY,
      { align: "right" }
    );
  }

  if (order.pricing.walletDeduction > 0) {
    curY += 15;
    doc.text("Wallet Applied:", summaryX, curY);
    doc.text(
      `-INR ${order.pricing.walletDeduction.toLocaleString("en-IN")}`,
      valueX,
      curY,
      { align: "right" }
    );
  }

  curY += 15;
  doc.text("Delivery Charges:", summaryX, curY);
  doc.text(
    order.pricing.deliveryCharge === 0 ? "FREE" : `INR ${order.pricing.deliveryCharge}`,
    valueX,
    curY,
    { align: "right" }
  );

  curY += 15;
  doc.text("Estimated Tax (5%):", summaryX, curY);
  doc.text(`INR ${order.pricing.tax.toLocaleString("en-IN")}`, valueX, curY, {
    align: "right",
  });

  curY += 20;
  doc.rect(340, curY - 5, 215, 26).fill("#f9fafb");
  doc.fillColor("#800020").fontSize(11).font("Helvetica-Bold");
  doc.text("Final Total Amount:", summaryX, curY + 2);
  doc.text(
    `INR ${order.pricing.finalTotal.toLocaleString("en-IN")}`,
    valueX,
    curY + 2,
    { align: "right" }
  );

  // 5. Footer Notes
  const footerY = 740;
  doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();
  doc
    .fontSize(8)
    .fillColor("#6b7280")
    .font("Helvetica")
    .text(
      "Thank you for shopping with Audiro! For customer support, visit https://audiro.com or email support@audiro.com.",
      40,
      footerY + 10,
      { align: "center", width: 515 }
    );
  doc.text(
    "This is a computer-generated tax invoice and requires no signature.",
    40,
    footerY + 24,
    { align: "center", width: 515 }
  );

  doc.end();
};

// Admin Order Management Services
const getAdminOrdersService = async ({
  search = "",
  status = "",
  startDate = "",
  endDate = "",
  sort = "-createdAt",
  page = 1,
  limit = 10,
} = {}) => {
  const totalRevenue='';
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalOrders] = await Promise.all([
    findAdminOrders({
      search,
      status,
      startDate,
      endDate,
      sort,
      skip,
      limit: limitNum,
    }),
    countAdminOrders({ search, status, startDate, endDate }),
  ]);

  return {
    orders,
    totalOrders,
    totalRevenue,
    currentPage: pageNum,
    totalPages: Math.ceil(totalOrders / limitNum) || 1,
  };
};

const getAdminOrderDetailsService = async (orderIdentifier) => {
  if (!orderIdentifier) {
    throw new Error("Order ID is required");
  }
  const cleanId = String(orderIdentifier).trim();
  let order = null;
  if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
    order = await findOrderById(cleanId);
  }
  if (!order) {
    order = await findOrderByOrderId(cleanId);
  }
  if (!order) {
    order = await Order.findOne({
      $or: [
        { orderId: cleanId },
        { orderId: { $regex: new RegExp(`^${cleanId}$`, "i") } },
      ],
    }).populate("user", "username email phone profile");
  }

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
};

const updateOrderStatusByAdminService = async (
  orderIdentifier,
  newStatus,
  reason = ""
) => {
  const allowedStatuses = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Returned",
  ];

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const order = await getAdminOrderDetailsService(orderIdentifier);

  if (order.orderStatus === newStatus) {
    return order;
  }

  // Enforce forward-only progression
  const allowedNext = ORDER_STATUS_FLOW[order.orderStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(
      `Cannot change order status from "${order.orderStatus}" to "${newStatus}". Order status can only advance forward and cannot be reverted.`
    );
  }

  if (newStatus === "Cancelled" && order.orderStatus !== "Cancelled") {
    for (const item of order.items) {
      if (!item.stockRestored && item.status !== "Cancelled") {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
        if (item.variantId) {
          await Product.updateOne(
            { _id: item.product, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": item.quantity } }
          );
        }
        item.stockRestored = true;
        item.status = "Cancelled";
        item.cancellationReason = reason || "Cancelled by Admin";
        item.cancelledAt = new Date();
      }
    }

    // Direct refund to customer wallet if paid
    const isPaid =
      order.paymentStatus === "Completed" ||
      order.paymentMethod === "Wallet" ||
      (order.walletAmountPaid && order.walletAmountPaid > 0);

    if (isPaid && !order.refundDetails?.isRefunded) {
      const refundAmount = order.pricing.finalTotal;
      if (refundAmount > 0) {
        const customerUserId = order.user?._id
          ? order.user._id.toString()
          : order.user.toString();

        await creditUserWalletService(
          customerUserId,
          refundAmount,
          `Refund for cancelled order #${order.orderId}`,
          "cancellation_refund",
          order.orderId
        );
        order.refundDetails = {
          isRefunded: true,
          amount: refundAmount,
          refundedTo: "Wallet",
          transactionId: `TXN-REF-${Date.now()}`,
          refundedAt: new Date(),
        };
      }
    }

    order.cancellationReason = reason || "Cancelled by Admin";
    order.cancelledAt = new Date();
    order.isStockRestored = true;
  } else if (newStatus === "Delivered") {
    order.paymentStatus = "Completed";
    const customerUserId = order.user?._id
      ? order.user._id.toString()
      : order.user.toString();
    await checkAndApplyReferralReward(customerUserId);
  }

  order.orderStatus = newStatus;
  await order.save();
  return order;
};

// Admin Returns & Refunds listing
const getAdminReturnsService = async ({ search = "", status = "", page = 1, limit = 10 } = {}) => {
  const query = {
    $or: [
      { "returnRequest.status": { $in: ["Requested", "Approved", "Rejected"] } },
      { orderStatus: "Returned" },
    ],
  };

  if (status && status !== "All") {
    if (status === "Returned") {
      query.orderStatus = "Returned";
    } else {
      query["returnRequest.status"] = status;
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$and = [
      {
        $or: [
          { orderId: { $regex: s, $options: "i" } },
          { "shippingAddress.name": { $regex: s, $options: "i" } },
          { "shippingAddress.phone": { $regex: s, $options: "i" } },
          { "returnRequest.reason": { $regex: s, $options: "i" } },
        ],
      },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [returns, totalReturns] = await Promise.all([
    Order.find(query)
      .populate("user", "name email phone username")
      .populate("items.product", "name brand images")
      .sort({ "returnRequest.requestedAt": -1, updatedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(query),
  ]);

  const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    Order.countDocuments({
      $or: [
        { "returnRequest.status": { $in: ["Requested", "Approved", "Rejected"] } },
        { orderStatus: "Returned" },
      ],
    }),
    Order.countDocuments({ "returnRequest.status": "Requested" }),
    Order.countDocuments({
      $or: [
        { "returnRequest.status": "Approved" },
        { orderStatus: "Returned" },
      ],
    }),
    Order.countDocuments({ "returnRequest.status": "Rejected" }),
  ]);

  return {
    returns,
    totalReturns,
    currentPage: pageNum,
    totalPages: Math.ceil(totalReturns / limitNum) || 1,
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
  };
};

// Admin Inventory / Stock Management
const updateProductStockByAdminService = async (productId, newStock) => {
  const parsedStock = parseInt(newStock, 10);
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new Error("Stock must be a non-negative integer");
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { stock: parsedStock },
    { returnDocument: "after" }
  ).populate("category", "name isActive");

  if (!updatedProduct) {
    throw new Error("Product not found");
  }

  return updatedProduct;
};

module.exports = {
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
  getAdminReturnsService,
  updateOrderStatusService,
  generateOrderInvoicePDF,
  getAdminOrdersService,
  getAdminOrderDetailsService,
  updateOrderStatusByAdminService,
  updateProductStockByAdminService,
};
