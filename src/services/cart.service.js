const Cart = require("../models/cart.model.js");
const Product = require("../models/product.model.js");
const Wishlist = require("../models/wishlist.model.js");
const { findActiveOffers } = require("../repositories/offer.repository.js");
const { calculateBestProductOffer } = require("./offer.service.js");

const MAX_QUANTITY_PER_ITEM = 5;

const getCartService = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name brand price discountPrice category stock images isActive isDeleted colors variants",
    populate: { path: "category", select: "name" },
  });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    return {
      items: [],
      subtotal: 0,
      discountTotal: 0,
      deliveryCharge: 0,
      tax: 0,
      total: 0,
      hasOutOfStock: false,
      itemCount: 0,
    };
  }

  let activeOffers = [];
  try {
    activeOffers = await findActiveOffers();
  } catch (e) {
    activeOffers = [];
  }

  // Filter out any items where product is completely deleted from DB
  const validItems = [];
  let subtotal = 0;
  let hasOutOfStock = false;
  let totalDiscount = 0;

  for (const item of cart.items) {
    if (!item.product) continue;

    const prod = item.product;
    const isAvailable = prod.isActive && !prod.isDeleted;

    let availableStock = prod.stock;
    let originalPrice = prod.price;
    let itemPrice = prod.discountPrice > 0 ? prod.discountPrice : prod.price;
    let itemImage = (prod.images && prod.images[0]) || "";
    let itemSku = "";
    let itemStorage = item.storage || "";
    let itemColor = item.color || "";

    // If item is tied to a variant, calculate based on variant
    if (item.variantId && Array.isArray(prod.variants)) {
      const variant = prod.variants.id(item.variantId);
      if (variant && !variant.isDeleted) {
        availableStock = variant.stock;
        originalPrice = variant.price;
        itemPrice = variant.discountPrice > 0 ? variant.discountPrice : variant.price;
        if (variant.images && variant.images.length > 0) {
          itemImage = variant.images[0];
        }
        itemSku = variant.sku || "";
        itemStorage = variant.storage || itemStorage;
        itemColor = variant.color || itemColor;
      } else {
        availableStock = 0;
      }
    }

    // Apply best promotional offer
    const offerRes = calculateBestProductOffer(prod, activeOffers);
    if (offerRes && offerRes.finalPrice < itemPrice) {
      itemPrice = offerRes.finalPrice;
    }

    const isOutOfStock = !isAvailable || availableStock <= 0 || item.quantity > availableStock;
    if (isOutOfStock) {
      hasOutOfStock = true;
    }

    const lineTotal = itemPrice * item.quantity;
    subtotal += lineTotal;

    if (originalPrice > itemPrice) {
      totalDiscount += (originalPrice - itemPrice) * item.quantity;
    }

    validItems.push({
      _id: item._id,
      product: {
        _id: prod._id,
        name: prod.name,
        brand: prod.brand,
        price: originalPrice,
        discountPrice: itemPrice < originalPrice ? itemPrice : 0,
        appliedOffer: offerRes?.bestOffer
          ? {
              name: offerRes.bestOffer.name,
              discountPercentage: offerRes.discountPercentage,
            }
          : null,
        stock: availableStock,
        images: prod.images,
        isActive: prod.isActive,
        isDeleted: prod.isDeleted,
      },
      variantId: item.variantId || null,
      color: itemColor,
      storage: itemStorage,
      sku: itemSku,
      image: itemImage,
      quantity: item.quantity,
      price: itemPrice,
      originalPrice,
      lineTotal,
      isAvailable,
      isOutOfStock,
      maxAllowed: Math.min(MAX_QUANTITY_PER_ITEM, availableStock),
    });
  }

  const deliveryCharge = subtotal > 500 || subtotal === 0 ? 0 : 40;
  const tax = Math.round(subtotal * 0.05); // 5% tax
  const total = subtotal - totalDiscount + deliveryCharge + tax;

  const itemCount = validItems.reduce((sum, it) => sum + it.quantity, 0);

  return {
    items: validItems,
    subtotal,
    discountTotal: totalDiscount,
    deliveryCharge,
    tax,
    total: Math.max(0, total),
    hasOutOfStock,
    itemCount,
  };
};

const addToCartService = async (
  userId,
  productId,
  quantity = 1,
  color = "",
  variantId = null,
  storage = ""
) => {
  const reqQty = Math.max(1, Number(quantity));

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: false,
  });

  if (!product) {
    throw new Error("This product is currently unavailable or unlisted.");
  }

  let matchedVariant = null;
  if (variantId && product.variants && product.variants.length > 0) {
    matchedVariant = product.variants.id(variantId);
    if (!matchedVariant || matchedVariant.isDeleted || !matchedVariant.isActive) {
      throw new Error("Selected product variant is unavailable.");
    }
  } else if (color && product.variants && product.variants.length > 0) {
    matchedVariant = product.variants.find(
      (v) =>
        v.color.toLowerCase() === color.trim().toLowerCase() &&
        (!storage || v.storage.toLowerCase() === storage.trim().toLowerCase()) &&
        v.isActive &&
        !v.isDeleted
    );
  }

  const availableStock = matchedVariant ? matchedVariant.stock : product.stock;
  if (availableStock <= 0) {
    throw new Error(
      matchedVariant
        ? `The variant "${matchedVariant.color} ${matchedVariant.storage || ""}".trim() is currently out of stock.`
        : "This product is out of stock."
    );
  }

  const itemPrice = matchedVariant
    ? matchedVariant.discountPrice > 0
      ? matchedVariant.discountPrice
      : matchedVariant.price
    : product.discountPrice > 0
    ? product.discountPrice
    : product.price;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const finalColor = matchedVariant ? matchedVariant.color : color || (product.colors && product.colors[0]) || "";
  const finalStorage = matchedVariant ? matchedVariant.storage : storage || "";
  const finalVariantId = matchedVariant ? matchedVariant._id : null;

  const itemIndex = cart.items.findIndex((item) => {
    if (finalVariantId && item.variantId) {
      return item.variantId.toString() === finalVariantId.toString();
    }
    return item.product.toString() === productId && (!finalColor || item.color === finalColor);
  });

  const maxAllowed = Math.min(MAX_QUANTITY_PER_ITEM, availableStock);

  if (itemIndex > -1) {
    const existingQty = cart.items[itemIndex].quantity;
    const newQty = existingQty + reqQty;

    if (newQty > maxAllowed) {
      throw new Error(
        `Cannot add more. Limit is ${maxAllowed} items (Current in cart: ${existingQty}, Stock available: ${availableStock}).`
      );
    }

    cart.items[itemIndex].quantity = newQty;
    cart.items[itemIndex].price = itemPrice;
  } else {
    if (reqQty > maxAllowed) {
      throw new Error(`Cannot add ${reqQty} items. Maximum limit is ${maxAllowed} items.`);
    }

    cart.items.push({
      product: productId,
      variantId: finalVariantId,
      quantity: reqQty,
      color: finalColor,
      storage: finalStorage,
      price: itemPrice,
    });
  }

  await cart.save();

  // Remove from wishlist when added to cart
  await Wishlist.updateOne({ user: userId }, { $pull: { products: productId } });

  return await getCartService(userId);
};

const updateCartQuantityService = async (
  userId,
  productId,
  quantity,
  color = "",
  variantId = null
) => {
  const newQty = Number(quantity);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new Error("Cart not found");
  }

  const itemIndex = cart.items.findIndex((item) => {
    if (variantId && item.variantId) {
      return item.variantId.toString() === variantId.toString();
    }
    return item.product.toString() === productId && (!color || item.color === color);
  });

  if (itemIndex === -1) {
    throw new Error("Item not found in cart");
  }

  if (newQty <= 0) {
    cart.items.splice(itemIndex, 1);
    await cart.save();
    return await getCartService(userId);
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive || product.isDeleted) {
    throw new Error("This product is no longer available");
  }

  let availableStock = product.stock;
  if (cart.items[itemIndex].variantId && product.variants) {
    const v = product.variants.id(cart.items[itemIndex].variantId);
    if (v && !v.isDeleted) {
      availableStock = v.stock;
    }
  }

  const maxAllowed = Math.min(MAX_QUANTITY_PER_ITEM, availableStock);

  if (newQty > maxAllowed) {
    throw new Error(
      `Cannot set quantity to ${newQty}. Maximum limit is ${maxAllowed} (Stock: ${availableStock}).`
    );
  }

  cart.items[itemIndex].quantity = newQty;
  await cart.save();

  return await getCartService(userId);
};

const removeFromCartService = async (userId, productId, color = "", variantId = null) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new Error("Cart not found");
  }

  cart.items = cart.items.filter((item) => {
    if (variantId && item.variantId) {
      return item.variantId.toString() !== variantId.toString();
    }
    if (item.product.toString() === productId) {
      if (color && item.color !== color) return true;
      return false;
    }
    return true;
  });

  await cart.save();
  return await getCartService(userId);
};

const clearCartService = async (userId) => {
  await Cart.findOneAndUpdate({ user: userId }, { items: [] });
  return await getCartService(userId);
};

module.exports = {
  getCartService,
  addToCartService,
  updateCartQuantityService,
  removeFromCartService,
  clearCartService,
};
