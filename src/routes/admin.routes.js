const express = require("express");

const {
  adminLogin,
  getAllUsers,
  toggleUserBlock,
  getDashboardStats,
} = require("../controllers/admin.controller.js");


const {
  createCategory,
  updateCategory,
  getCategories,
  getCategoryById,
  toggleCategoryStatus,
  deleteCategory,
  restoreCategory,
} = require("../controllers/category.controller.js");

const {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  deleteProduct,
  restoreProduct,
} = require("../controllers/product.controller.js");

const {
  getAdminOrders,
  getAdminOrderDetails,
  updateAdminOrderStatus,
  adminReviewReturnRequest,
  getAdminReturns,
  downloadAdminInvoice,
  updateProductStock,
} = require("../controllers/order.controller.js");

const {
  getAdminProductVariants,
  createAdminProductVariant,
  updateAdminProductVariant,
  deleteAdminProductVariant,
  toggleAdminProductVariantStatus,
} = require("../controllers/variant.controller.js");

const {
  getAdminCoupons,
  createAdminCoupon,
  getAdminCouponById,
  updateAdminCoupon,
  deleteAdminCoupon,
  toggleAdminCouponStatus,
} = require("../controllers/coupon.controller.js");

const {
  getAdminOffers,
  createAdminOffer,
  getAdminOfferById,
  updateAdminOffer,
  deleteAdminOffer,
  toggleAdminOfferStatus,
} = require("../controllers/offer.controller.js");

const {
  getSalesReport,
  downloadSalesReportExcel,
  downloadSalesReportPdf,
} = require("../controllers/report.controller.js");

const adminMiddleware = require("../middleware/admin.middleware.js");
const upload = require("../middleware/upload.middleware.js");

const router = express.Router();

// Admin Authentication
router.post("/login", adminLogin);

// Protect all subsequent admin routes
router.use(adminMiddleware);

// Users Management
router.get("/users", getAllUsers);
router.patch("/users/:userId/block", toggleUserBlock);

// Dashboard Analytics & Charts
router.get("/dashboard/stats", getDashboardStats);


// Category Management Routes
router.post("/categories", adminMiddleware, createCategory);
router.get("/categories", adminMiddleware, getCategories);
router.get("/categories/:id", adminMiddleware, getCategoryById);
router.put("/categories/:id", adminMiddleware, updateCategory);
router.patch("/categories/:id/toggle", adminMiddleware, toggleCategoryStatus);
router.delete("/categories/:id", adminMiddleware, deleteCategory);
router.patch("/categories/:id/delete", adminMiddleware, deleteCategory);
router.patch("/categories/:id/restore", adminMiddleware, restoreCategory);

// Product Management Routes
router.post("/products", adminMiddleware, upload.any(), createProduct);
router.get("/products", adminMiddleware, getProducts);
router.get("/products/:id", adminMiddleware, getProductById);
router.put("/products/:id", adminMiddleware, upload.any(), updateProduct);
router.delete("/products/:id", adminMiddleware, deleteProduct);
router.patch("/products/:id/delete", adminMiddleware, deleteProduct);
router.patch("/products/:id/restore", adminMiddleware, restoreProduct);

// Admin Order Management Routes
router.get("/orders", adminMiddleware, getAdminOrders);
router.get("/orders/:orderId", adminMiddleware, getAdminOrderDetails);
router.patch("/orders/:orderId/status", adminMiddleware, updateAdminOrderStatus);
router.patch(
  "/orders/:orderId/return-request",
  adminMiddleware,
  adminReviewReturnRequest
);
router.get("/orders/:orderId/invoice", adminMiddleware, downloadAdminInvoice);

// Admin Returns & Refunds Management Routes
router.get("/returns", adminMiddleware, getAdminReturns);
router.patch("/returns/:orderId", adminMiddleware, adminReviewReturnRequest);

// Inventory / Stock Management Route
router.patch("/products/:productId/stock", adminMiddleware, updateProductStock);

// Product Variant Management Routes
router.get("/products/:productId/variants", adminMiddleware, getAdminProductVariants);
router.post(
  "/products/:productId/variants",
  adminMiddleware,
  upload.array("images", 5),
  createAdminProductVariant
);
router.put(
  "/products/:productId/variants/:variantId",
  adminMiddleware,
  upload.array("images", 5),
  updateAdminProductVariant
);
router.patch(
  "/products/:productId/variants/:variantId/status",
  adminMiddleware,
  toggleAdminProductVariantStatus
);
router.delete(
  "/products/:productId/variants/:variantId",
  adminMiddleware,
  deleteAdminProductVariant
);

// Admin Coupon Management Routes
router.get("/coupons", adminMiddleware, getAdminCoupons);
router.post("/coupons", adminMiddleware, createAdminCoupon);
router.get("/coupons/:id", adminMiddleware, getAdminCouponById);
router.put("/coupons/:id", adminMiddleware, updateAdminCoupon);
router.delete("/coupons/:id", adminMiddleware, deleteAdminCoupon);
router.patch("/coupons/:id/toggle", adminMiddleware, toggleAdminCouponStatus);

// Admin Offer Management Routes
router.get("/offers", adminMiddleware, getAdminOffers);
router.post("/offers", adminMiddleware, createAdminOffer);
router.get("/offers/:id", adminMiddleware, getAdminOfferById);
router.put("/offers/:id", adminMiddleware, updateAdminOffer);
router.delete("/offers/:id", adminMiddleware, deleteAdminOffer);
router.patch("/offers/:id/toggle", adminMiddleware, toggleAdminOfferStatus);

// Admin Sales Reports & Export Routes
router.get("/reports", adminMiddleware, getSalesReport);
router.get("/reports/excel", adminMiddleware, downloadSalesReportExcel);
router.get("/reports/pdf", adminMiddleware, downloadSalesReportPdf);

module.exports = router;