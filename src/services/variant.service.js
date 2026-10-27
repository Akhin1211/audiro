const {
  findProductById,
  addVariant,
  updateVariant,
  deleteVariant,
  toggleVariantStatus,
} = require("../repositories/product.repository.js");

const getVariantsService = async (productId) => {
  const product = await findProductById(productId);
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  const activeVariants = (product.variants || []).filter((v) => !v.isDeleted);

  return {
    product: {
      _id: product._id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      images: product.images,
      price: product.price,
      discountPrice: product.discountPrice,
      stock: product.stock,
      isActive: product.isActive,
    },
    variants: activeVariants,
    totalVariants: activeVariants.length,
    activeVariantsCount: activeVariants.filter((v) => v.isActive).length,
  };
};

const createVariantService = async (productId, data) => {
  const {
    color,
    storage,
    sku,
    price,
    discountPrice = 0,
    stock = 0,
    images = [],
    isActive = true,
  } = data;

  if (!color || !color.trim()) {
    throw new Error("Variant color is required");
  }

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    throw new Error("Valid price is required for variant");
  }

  if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) {
    throw new Error("Valid non-negative stock is required for variant");
  }

  const numPrice = Number(price);
  const numDiscount = discountPrice ? Number(discountPrice) : 0;
  if (numDiscount < 0) {
    throw new Error("Discount price cannot be negative");
  }

  // Generate fallback SKU if empty
  let finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : "";
  if (!finalSku) {
    const colCode = color.trim().substring(0, 3).toUpperCase();
    const storCode = storage && storage.trim() ? storage.trim().replace(/\s+/g, "").toUpperCase() : "DEF";
    finalSku = `AUD-${colCode}-${storCode}-${Date.now().toString(36).toUpperCase()}`;
  }

  const variantObj = {
    color: color.trim(),
    storage: storage ? storage.trim() : "",
    sku: finalSku,
    price: numPrice,
    discountPrice: numDiscount,
    stock: Number(stock),
    images: Array.isArray(images) ? images : [],
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    isDeleted: false,
  };

  const updatedProduct = await addVariant(productId, variantObj);
  const newlyCreated = updatedProduct.variants[updatedProduct.variants.length - 1];

  return {
    product: updatedProduct,
    variant: newlyCreated,
  };
};

const updateVariantService = async (productId, variantId, updateData) => {
  if (updateData.color !== undefined && !updateData.color.trim()) {
    throw new Error("Variant color cannot be empty");
  }

  if (updateData.price !== undefined) {
    if (isNaN(Number(updateData.price)) || Number(updateData.price) < 0) {
      throw new Error("Valid price is required for variant");
    }
    updateData.price = Number(updateData.price);
  }

  if (updateData.discountPrice !== undefined) {
    if (isNaN(Number(updateData.discountPrice)) || Number(updateData.discountPrice) < 0) {
      throw new Error("Discount price cannot be negative");
    }
    updateData.discountPrice = Number(updateData.discountPrice);
  }

  if (updateData.stock !== undefined) {
    if (isNaN(Number(updateData.stock)) || Number(updateData.stock) < 0) {
      throw new Error("Valid non-negative stock is required for variant");
    }
    updateData.stock = Number(updateData.stock);
  }

  return await updateVariant(productId, variantId, updateData);
};

const deleteVariantService = async (productId, variantId) => {
  return await deleteVariant(productId, variantId);
};

const toggleVariantStatusService = async (productId, variantId, isActive) => {
  return await toggleVariantStatus(productId, variantId, isActive);
};

module.exports = {
  getVariantsService,
  createVariantService,
  updateVariantService,
  deleteVariantService,
  toggleVariantStatusService,
};
