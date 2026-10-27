const {
  findProductById,
  createProduct,
  updateProduct,
  findProducts,
  countProducts,
  softDeleteProduct,
  restoreProduct,
} = require("../repositories/product.repository.js");
const { findCategoryById } = require("../repositories/category.repository.js");

const createProductService = async (productData) => {
  const {
    name,
    category,
    brand,
    price,
    discountPrice,
    stock,
    images,
    colors,
    shortDescription,
    fullDescription,
    specifications,
    isActive,
    variants,
  } = productData;

  if (!name || !name.trim()) {
    throw new Error("Product name is required");
  }

  if (!category) {
    throw new Error("Category is required");
  }

  const categoryExists = await findCategoryById(category);
  if (!categoryExists || categoryExists.isDeleted) {
    throw new Error("Selected category is invalid or deleted");
  }

  if (!brand || !brand.trim()) {
    throw new Error("Brand is required");
  }

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    throw new Error("Valid price is required");
  }

  if (!Array.isArray(images) || images.length < 3) {
    throw new Error("Minimum 3 product images are required");
  }

  let finalStock = Number(stock);
  let finalColors = Array.isArray(colors) ? colors : [];

  if (Array.isArray(variants) && variants.length > 0) {
    for (const v of variants) {
      if (!v.color || !v.color.trim()) {
        throw new Error("Variant color is required");
      }
      if (v.price === undefined || isNaN(Number(v.price)) || Number(v.price) < 0) {
        throw new Error(`Variant (${v.color}) price must be a valid positive number`);
      }
      if (v.stock === undefined || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
        throw new Error(`Variant (${v.color}) stock must be a valid positive number`);
      }
    }
    const activeVariants = variants.filter((v) => !v.isDeleted && v.isActive !== false);
    finalStock = activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const variantColors = variants.map((v) => v.color?.trim()).filter(Boolean);
    finalColors = Array.from(new Set([...finalColors, ...variantColors]));
  } else {
    if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) {
      throw new Error("Valid stock quantity is required");
    }
  }

  return await createProduct({
    name: name.trim(),
    category,
    brand: brand.trim(),
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : 0,
    stock: finalStock,
    images,
    colors: finalColors,
    shortDescription: shortDescription ? shortDescription.trim() : "",
    fullDescription: fullDescription ? fullDescription.trim() : "",
    specifications: Array.isArray(specifications) ? specifications : [],
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    variants: Array.isArray(variants) ? variants : [],
  });
};

const updateProductService = async (id, updateData) => {
  const product = await findProductById(id);
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }

  if (updateData.category) {
    const categoryExists = await findCategoryById(updateData.category);
    if (!categoryExists || categoryExists.isDeleted) {
      throw new Error("Selected category is invalid or deleted");
    }
  }

  if (updateData.price !== undefined) {
    if (isNaN(Number(updateData.price)) || Number(updateData.price) < 0) {
      throw new Error("Valid price is required");
    }
    updateData.price = Number(updateData.price);
  }

  if (updateData.variants !== undefined && Array.isArray(updateData.variants)) {
    for (const v of updateData.variants) {
      if (!v.color || !v.color.trim()) {
        throw new Error("Variant color is required");
      }
      if (v.price === undefined || isNaN(Number(v.price)) || Number(v.price) < 0) {
        throw new Error(`Variant (${v.color}) price must be a valid positive number`);
      }
      if (v.stock === undefined || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
        throw new Error(`Variant (${v.color}) stock must be a valid positive number`);
      }
    }
    const activeVariants = updateData.variants.filter((v) => !v.isDeleted && v.isActive !== false);
    updateData.stock = activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const variantColors = updateData.variants.map((v) => v.color?.trim()).filter(Boolean);
    const baseColors = Array.isArray(updateData.colors) ? updateData.colors : (product.colors || []);
    updateData.colors = Array.from(new Set([...baseColors, ...variantColors]));
  } else if (updateData.stock !== undefined) {
    if (isNaN(Number(updateData.stock)) || Number(updateData.stock) < 0) {
      throw new Error("Valid stock quantity is required");
    }
    updateData.stock = Number(updateData.stock);
  }

  if (updateData.images !== undefined) {
    if (!Array.isArray(updateData.images) || updateData.images.length < 3) {
      throw new Error("Minimum 3 product images are required");
    }
  }

  return await updateProduct(id, updateData);
};

const getProductsService = async ({
  search = "",
  category = "",
  brand = "",
  stockStatus = "",
  sort = "-createdAt",
  page = 1,
  limit = 5,
}) => {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const products = await findProducts({
    search,
    category,
    brand,
    stockStatus,
    sort,
    skip,
    limit: limitNum,
  });

  const totalProducts = await countProducts({
    search,
    category,
    brand,
    stockStatus,
  });

  return {
    products,
    currentPage: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum) || 1,
    totalProducts,
  };
};

const getProductByIdService = async (id) => {
  const product = await findProductById(id);
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }
  return product;
};

const deleteProductService = async (id) => {
  const product = await findProductById(id);
  if (!product || product.isDeleted) {
    throw new Error("Product not found");
  }
  return await softDeleteProduct(id);
};

const restoreProductService = async (id) => {
  const product = await findProductById(id);
  if (!product) {
    throw new Error("Product not found");
  }
  return await restoreProduct(id);
};

module.exports = {
  createProductService,
  updateProductService,
  getProductsService,
  getProductByIdService,
  deleteProductService,
  restoreProductService,
};
