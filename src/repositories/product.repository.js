const Product = require("../models/product.model.js");

const findProductById = async (id) => {
  return await Product.findById(id).populate("category", "name isActive");
};

const createProduct = async (productData) => {
  const product = await Product.create(productData);
  return await Product.findById(product._id).populate("category", "name isActive");
};

const updateProduct = async (id, updateData) => {
  const product = await Product.findById(id);
  if (!product) return null;

  Object.keys(updateData).forEach((key) => {
    product[key] = updateData[key];
  });

  if (product.variants && product.variants.length > 0) {
    syncProductFromVariants(product);
  }

  await product.save();
  return await Product.findById(id).populate("category", "name isActive");
};

const findProducts = async ({
  search = "",
  category = "",
  brand = "",
  stockStatus = "",
  sort = "-createdAt",
  skip = 0,
  limit = 10,
}) => {
  const query = { isDeleted: false };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (brand) {
    query.brand = { $regex: brand, $options: "i" };
  }

  if (stockStatus === "In Stock") {
    query.stock = { $gt: 10 };
  } else if (stockStatus === "Low Stock") {
    query.stock = { $gt: 0, $lte: 10 };
  } else if (stockStatus === "Out of Stock") {
    query.stock = 0;
  }

  const sortOptions = {};
  if (sort === "price_asc") sortOptions.price = 1;
  else if (sort === "price_desc") sortOptions.price = -1;
  else if (sort === "name_asc") sortOptions.name = 1;
  else if (sort === "stock_desc") sortOptions.stock = -1;
  else sortOptions.createdAt = -1;

  return await Product.find(query)
    .populate("category", "name isActive")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
};

const countProducts = async ({
  search = "",
  category = "",
  brand = "",
  stockStatus = "",
}) => {
  const query = { isDeleted: false };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (brand) {
    query.brand = { $regex: brand, $options: "i" };
  }

  if (stockStatus === "In Stock") {
    query.stock = { $gt: 10 };
  } else if (stockStatus === "Low Stock") {
    query.stock = { $gt: 0, $lte: 10 };
  } else if (stockStatus === "Out of Stock") {
    query.stock = 0;
  }

  return await Product.countDocuments(query);
};

const softDeleteProduct = async (id) => {
  return await Product.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { returnDocument: "after"}
  );
};

const restoreProduct = async (id) => {
  return await Product.findByIdAndUpdate(
    id,
    { isDeleted: false, isActive: true },
    { returnDocument: "after" }
  );
};

// Variant Repository Methods
const syncProductFromVariants = (product) => {
  const activeVariants = (product.variants || []).filter(
    (v) => !v.isDeleted && v.isActive
  );
  if (product.variants && product.variants.length > 0) {
    product.stock = activeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    // Sync colors list
    const uniqueColors = Array.from(
      new Set(
        product.variants
          .filter((v) => !v.isDeleted)
          .map((v) => v.color)
          .filter(Boolean)
      )
    );
    product.colors = uniqueColors;
  }
};

const addVariant = async (productId, variantData) => {
  const product = await Product.findById(productId).populate("category", "name isActive");
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  product.variants.push(variantData);
  syncProductFromVariants(product);
  await product.save();
  return product;
};

const updateVariant = async (productId, variantId, updateData) => {
  const product = await Product.findById(productId).populate("category", "name isActive");
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  const variant = product.variants.id(variantId);
  if (!variant || variant.isDeleted) {
    throw new Error("Variant not found");
  }

  if (updateData.color !== undefined) variant.color = updateData.color.trim();
  if (updateData.storage !== undefined) variant.storage = updateData.storage.trim();
  if (updateData.sku !== undefined) variant.sku = updateData.sku.trim();
  if (updateData.price !== undefined) variant.price = Number(updateData.price);
  if (updateData.discountPrice !== undefined)
    variant.discountPrice = Number(updateData.discountPrice) || 0;
  if (updateData.stock !== undefined) variant.stock = Number(updateData.stock);
  if (updateData.images !== undefined) variant.images = updateData.images;
  if (updateData.isActive !== undefined) variant.isActive = Boolean(updateData.isActive);

  syncProductFromVariants(product);
  await product.save();
  return { product, variant };
};

const deleteVariant = async (productId, variantId) => {
  const product = await Product.findById(productId).populate("category", "name isActive");
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  const variant = product.variants.id(variantId);
  if (!variant || variant.isDeleted) {
    throw new Error("Variant not found");
  }

  // Soft delete or pull
  variant.isDeleted = true;
  variant.isActive = false;

  syncProductFromVariants(product);
  await product.save();
  return product;
};

const toggleVariantStatus = async (productId, variantId, newActiveStatus) => {
  const product = await Product.findById(productId).populate("category", "name isActive");
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  const variant = product.variants.id(variantId);
  if (!variant || variant.isDeleted) {
    throw new Error("Variant not found");
  }

  variant.isActive =
    newActiveStatus !== undefined ? Boolean(newActiveStatus) : !variant.isActive;

  syncProductFromVariants(product);
  await product.save();
  return { product, variant };
};

module.exports = {
  findProductById,
  createProduct,
  updateProduct,
  findProducts,
  countProducts,
  softDeleteProduct,
  restoreProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  toggleVariantStatus,
  syncProductFromVariants,
};
