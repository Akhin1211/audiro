const HTTP_STATUS = require("../constants/httpStatus.js");
const {
  getCartService,
  addToCartService,
  updateCartQuantityService,
  removeFromCartService,
  clearCartService,
} = require("../services/cart.service.js");

const getCart = async (req, res) => {
  try {
    const cart = await getCartService(req.userId);
    res.status(HTTP_STATUS.OK).json(cart);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, color = "", variantId = null, storage = "" } = req.body;
    if (!productId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Product ID is required" });
    }

    const cart = await addToCartService(req.userId, productId, quantity, color, variantId, storage);
    res.status(HTTP_STATUS.OK).json({
      message: "Product added to cart successfully",
      cart,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity, color = "", variantId = null } = req.body;
    if (!productId || quantity === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Product ID and quantity are required" });
    }

    const cart = await updateCartQuantityService(req.userId, productId, quantity, color, variantId);
    res.status(HTTP_STATUS.OK).json({
      message: "Cart updated successfully",
      cart,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { color = "", variantId = null } = req.query;

    const cart = await removeFromCartService(req.userId, productId, color, variantId);
    res.status(HTTP_STATUS.OK).json({
      message: "Item removed from cart",
      cart,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await clearCartService(req.userId);
    res.status(HTTP_STATUS.OK).json({
      message: "Cart cleared",
      cart,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
};
