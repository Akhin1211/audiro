const Wishlist = require("../models/wishlist.model.js");

const findWishlistByUserId = async (userId) => {
  return await Wishlist.findOne({ user: userId }).populate({
    path: "products",
    match: { isActive: true, isDeleted: false },
    select: "name brand price discountPrice stock images isActive isDeleted shortDescription",
  });
};

const findWishlistRawByUserId = async (userId) => {
  return await Wishlist.findOne({ user: userId });
};

const createWishlist = async (userId, products = []) => {
  return await Wishlist.create({ user: userId, products });
};

const addProductToWishlist = async (userId, productId) => {
  return await Wishlist.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: productId } },
    { returnDocument: "after", upsert: true }
  );
};

const removeProductFromWishlist = async (userId, productId) => {
  return await Wishlist.findOneAndUpdate(
    { user: userId },
    { $pull: { products: productId } },
    { returnDocument: "after"}
  );
};

module.exports = {
  findWishlistByUserId,
  findWishlistRawByUserId,
  createWishlist,
  addProductToWishlist,
  removeProductFromWishlist,
};
