const Product = require("../models/product.model.js");
const { addToCartService } = require("./cart.service.js");
const {
  findWishlistByUserId,
  findWishlistRawByUserId,
  createWishlist,
  addProductToWishlist,
  removeProductFromWishlist,
} = require("../repositories/wishlist.repository.js");

const getWishlistService = async (userId) => {
  let wishlist = await findWishlistByUserId(userId);

  if (!wishlist) {
    wishlist = await createWishlist(userId, []);
  }

  // Filter out any nulls that didn't match isActive/isDeleted
  const validProducts = (wishlist.products || []).filter(Boolean);

  return {
    products: validProducts,
    totalItems: validProducts.length,
  };
};

const addToWishlistService = async (userId, productId) => {
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: false,
  });

  if (!product) {
    throw new Error("Product not found or unavailable");
  }

  // $addToSet in repository guarantees no duplicate items
  await addProductToWishlist(userId, productId);

  return {
    isAdded: true,
    message: "Added to wishlist",
    wishlist: await getWishlistService(userId),
  };
};

const toggleWishlistService = async (userId, productId) => {
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: false,
  });

  if (!product) {
    throw new Error("Product not found or unavailable");
  }

  let wishlist = await findWishlistRawByUserId(userId);
  if (!wishlist) {
    wishlist = await createWishlist(userId, []);
  }

  const alreadyAdded = (wishlist.products || []).some(
    (p) => p.toString() === productId.toString()
  );

  let isAdded = false;
  if (alreadyAdded) {
    await removeProductFromWishlist(userId, productId);
    isAdded = false;
  } else {
    await addProductToWishlist(userId, productId);
    isAdded = true;
  }

  return {
    isAdded,
    message: isAdded ? "Added to wishlist" : "Removed from wishlist",
    wishlist: await getWishlistService(userId),
  };
};

const moveToCartService = async (userId, productId) => {
  // 1. Add to cart (cart service automatically removes product from wishlist as well)
  const cart = await addToCartService(userId, productId, 1);

  // 2. Explicitly remove from wishlist via repository
  await removeProductFromWishlist(userId, productId);

  const wishlist = await getWishlistService(userId);

  return {
    cart,
    wishlist,
    message: "Moved to cart successfully",
  };
};

const removeFromWishlistService = async (userId, productId) => {
  await removeProductFromWishlist(userId, productId);
  return await getWishlistService(userId);
};

module.exports = {
  getWishlistService,
  addToWishlistService,
  toggleWishlistService,
  moveToCartService,
  removeFromWishlistService,
};
