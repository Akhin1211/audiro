const Product = require("../models/product.model.js");
const Category = require("../models/category.model.js");
const { findActiveOffers } = require("../repositories/offer.repository.js");
const { calculateBestProductOffer } = require("./offer.service.js");

const getPublicProductsService = async ({
  search = "",
  category = "",
  brand = "",
  minPrice = "",
  maxPrice = "",
  sort = "newest",
  page = 1,
  limit = 9,
}) => {
  const query = {
    isActive: true,
    isDeleted: false,
  };

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { brand: { $regex: s, $options: "i" } },
      { shortDescription: { $regex: s, $options: "i" } },
    ];
  }

  if (category) {
    const catList = category.split(",").map((c) => c.trim()).filter(Boolean);
    if (catList.length > 0) {
      query.category = { $in: catList };
    }
  }

  if (brand) {
    const brandList = brand.split(",").map((b) => b.trim()).filter(Boolean);
    if (brandList.length > 0) {
      query.brand = { $in: brandList };
    }
  }

  if (minPrice !== "" || maxPrice !== "") {
    query.price = {};
    if (minPrice !== "" && !isNaN(Number(minPrice))) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice !== "" && !isNaN(Number(maxPrice))) {
      query.price.$lte = Number(maxPrice);
    }
  }

  let sortCriteria = { createdAt: -1 };
  if (sort === "price_asc" || sort === "price-asc") {
    sortCriteria = { price: 1 };
  } else if (sort === "price_desc" || sort === "price-desc") {
    sortCriteria = { price: -1 };
  } else if (sort === "a-z" || sort === "name_asc") {
    sortCriteria = { name: 1 };
  } else if (sort === "z-a" || sort === "name_desc") {
    sortCriteria = { name: -1 };
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [products, totalProducts] = await Promise.all([
    Product.find(query)
      .populate("category", "name isActive")
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(query),
  ]);

  let activeOffers = [];
  try {
    activeOffers = await findActiveOffers();
  } catch (e) {
    activeOffers = [];
  }

  const enrichedProducts = products.map((prod) => {
    const pObj = prod.toObject ? prod.toObject() : prod;
    const offerRes = calculateBestProductOffer(pObj, activeOffers);
    return {
      ...pObj,
      appliedOffer: offerRes.bestOffer
        ? {
            name: offerRes.bestOffer.name,
            discountPercentage: offerRes.discountPercentage,
            discountAmount: offerRes.discountAmount,
            originalPrice: offerRes.originalPrice,
            finalPrice: offerRes.finalPrice,
          }
        : null,
    };
  });

  return {
    products: enrichedProducts,
    currentPage: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum) || 1,
    totalProducts,
  };
};

const getPublicProductDetailService = async (id) => {
  const product = await Product.findOne({
    _id: id,
    isActive: true,
    isDeleted: false,
  }).populate("category", "name isActive");

  if (!product) {
    throw new Error("Product not found or currently unavailable");
  }

  // Fetch up to 4 related products from same category
  const relatedProducts = await Product.find({
    category: product.category?._id || product.category,
    _id: { $ne: product._id },
    isActive: true,
    isDeleted: false,
  })
    .limit(4)
    .populate("category", "name");

  let activeOffers = [];
  try {
    activeOffers = await findActiveOffers();
  } catch (e) {
    activeOffers = [];
  }

  const pObj = product.toObject ? product.toObject() : product;
  const offerRes = calculateBestProductOffer(pObj, activeOffers);
  const enrichedProduct = {
    ...pObj,
    appliedOffer: offerRes.bestOffer
      ? {
          name: offerRes.bestOffer.name,
          discountPercentage: offerRes.discountPercentage,
          discountAmount: offerRes.discountAmount,
          originalPrice: offerRes.originalPrice,
          finalPrice: offerRes.finalPrice,
        }
      : null,
  };

  const enrichedRelated = relatedProducts.map((rel) => {
    const rObj = rel.toObject ? rel.toObject() : rel;
    const rRes = calculateBestProductOffer(rObj, activeOffers);
    return {
      ...rObj,
      appliedOffer: rRes.bestOffer
        ? {
            name: rRes.bestOffer.name,
            discountPercentage: rRes.discountPercentage,
            discountAmount: rRes.discountAmount,
            originalPrice: rRes.originalPrice,
            finalPrice: rRes.finalPrice,
          }
        : null,
    };
  });

  return {
    product: enrichedProduct,
    relatedProducts: enrichedRelated,
  };
};

const getFilterMetaService = async () => {
  const [categories, brands, priceExtremes] = await Promise.all([
    Category.find({ isActive: true, isDeleted: false }, "name").sort({ name: 1 }),
    Product.distinct("brand", { isActive: true, isDeleted: false }),
    Product.aggregate([
      { $match: { isActive: true, isDeleted: false } },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]),
  ]);

  const minPrice = priceExtremes.length > 0 ? priceExtremes[0].minPrice : 0;
  const maxPrice = priceExtremes.length > 0 ? priceExtremes[0].maxPrice : 100000;

  return {
    categories,
    brands: brands.filter(Boolean).sort(),
    minPrice,
    maxPrice,
  };
};

module.exports = {
  getPublicProductsService,
  getPublicProductDetailService,
  getFilterMetaService,
};
