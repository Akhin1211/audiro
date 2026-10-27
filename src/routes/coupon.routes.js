const express = require("express");
const jwt = require("jsonwebtoken");
const {
  applyCouponUser,
  getAvailableCouponsUser,
} = require("../controllers/coupon.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();

// Optional auth helper to attach userId if logged in
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    } catch (e) {}
  }
  next();
};

// User browse active available coupons
router.get("/available", optionalAuth, getAvailableCouponsUser);

// User Apply Coupon at Checkout
router.post("/apply", authMiddleware, applyCouponUser);

module.exports = router;
