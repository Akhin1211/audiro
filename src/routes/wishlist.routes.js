const express = require("express");
const {
  getWishlist,
  addToWishlist,
  toggleWishlist,
  moveToCart,
  removeFromWishlist,
} = require("../controllers/wishlist.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.post("/toggle", toggleWishlist);
router.post("/move-to-cart", moveToCart);
router.delete("/item/:productId", removeFromWishlist);

module.exports = router;
