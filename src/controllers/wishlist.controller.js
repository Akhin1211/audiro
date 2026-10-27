const {
  getWishlistService,
  addToWishlistService,
  toggleWishlistService,
  moveToCartService,
  removeFromWishlistService,
} = require("../services/wishlist.service.js");

const getWishlist = async (req, res) => {
  try {
    const wishlist = await getWishlistService(req.userId);
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const result = await addToWishlistService(req.userId, productId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const result = await toggleWishlistService(req.userId, productId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const moveToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const result = await moveToCartService(req.userId, productId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist = await removeFromWishlistService(req.userId, productId);
    res.status(200).json({
      message: "Item removed from wishlist",
      wishlist,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  toggleWishlist,
  moveToCart,
  removeFromWishlist,
};
