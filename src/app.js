const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.router.js");
const adminRoutes = require("./routes/admin.routes.js");
const productRoutes = require("./routes/product.user.routes.js");
const cartRoutes = require("./routes/cart.routes.js");
const wishlistRoutes = require("./routes/wishlist.routes.js");
const orderRoutes = require("./routes/order.routes.js");
const walletRoutes = require("./routes/wallet.routes.js");
const couponRoutes = require("./routes/coupon.routes.js");
const offerRoutes = require("./routes/offer.routes.js");

const { errorHandler } = require("./middleware/error.middleware.js");
const HTTP_STATUS = require("./constants/httpStatus.js");

const app = express();

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/offers", offerRoutes);

app.get("/", (req, res) => {
  res.send("Audiro Backend Running");
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized global error handler
app.use(errorHandler);

module.exports = app;