const express = require("express");
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} = require("../controllers/cart.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCart);
router.post("/add", addToCart);
router.patch("/quantity", updateCartQuantity);
router.delete("/item/:productId", removeFromCart);
router.delete("/clear", clearCart);

module.exports = router;
