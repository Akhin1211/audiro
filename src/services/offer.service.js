const {
  createOffer,
  findOfferById,
  updateOffer,
  deleteOffer,
  listOffers,
  findActiveOffers,
} = require("../repositories/offer.repository.js");

const calculateBestProductOffer = (product, activeOffers = []) => {
  if (!product || !activeOffers || activeOffers.length === 0) {
    return {
      bestOffer: null,
      discountPercentage: 0,
      discountAmount: 0,
      originalPrice: product?.price || 0,
      finalPrice: product?.price || 0,
    };
  }

  const basePrice = Number(product.price) || 0;
  const prodIdStr = (product._id || product.id)?.toString();
  const catIdStr = (product.category?._id || product.category)?.toString();
  const prodBrand = product.brand?.toLowerCase();

  let maxDiscountPercent = 0;
  let bestOffer = null;

  for (const offer of activeOffers) {
    let isApplicable = false;

    if (offer.targetType === "All products") {
      isApplicable = true;
    } else if (offer.targetType === "Specific Products") {
      isApplicable = (offer.applicableProducts || []).some(
        (p) => (p._id || p)?.toString() === prodIdStr
      );
    } else if (offer.targetType === "Category") {
      isApplicable = (offer.applicableCategories || []).some(
        (c) => (c._id || c)?.toString() === catIdStr
      );
    } else if (offer.targetType === "Brands") {
      isApplicable = (offer.applicableBrands || []).some(
        (b) => b?.toLowerCase() === prodBrand
      );
    }

    if (isApplicable) {
      let percent = 0;
      if (offer.discountType === "Percentage") {
        percent = Number(offer.discountValue) || 0;
      } else {
        // Flat discount converted to percentage of basePrice for comparison
        percent = basePrice > 0 ? (Number(offer.discountValue) / basePrice) * 100 : 0;
      }

      // "apply the largest between product and category offer"
      if (percent > maxDiscountPercent) {
        maxDiscountPercent = percent;
        bestOffer = offer;
      }
    }
  }

  const discountAmount = Math.round((basePrice * maxDiscountPercent) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return {
    bestOffer,
    discountPercentage: Math.round(maxDiscountPercent),
    discountAmount,
    originalPrice: basePrice,
    finalPrice: finalPrice > 0 ? finalPrice : basePrice,
  };
};

const createOfferService = async (data) => {
  const {
    name,
    targetType,
    discountType,
    discountValue,
    applicableCategories,
    applicableProducts,
    applicableBrands,
    startDate,
    endDate,
    isActive,
  } = data;

  if (!name || !name.trim()) {
    throw new Error("Offer name is required");
  }

  if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
    throw new Error("Valid positive discount percentage is required");
  }

  if (Number(discountValue) > 90) {
    throw new Error("Discount percentage cannot exceed 90%");
  }

  if (!startDate || !endDate) {
    throw new Error("Valid start and end dates are required");
  }

  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("Start date cannot be after end date");
  }

  if (targetType === "Category" && (!applicableCategories || applicableCategories.length === 0)) {
    throw new Error("Please select at least one category for this offer");
  }

  if (targetType === "Specific Products" && (!applicableProducts || applicableProducts.length === 0)) {
    throw new Error("Please select at least one product for this offer");
  }

  return await createOffer({
    name: name.trim(),
    targetType: targetType || "Category",
    discountType: "Percentage",
    discountValue: Number(discountValue),
    applicableCategories: Array.isArray(applicableCategories) ? applicableCategories : [],
    applicableProducts: Array.isArray(applicableProducts) ? applicableProducts : [],
    applicableBrands: Array.isArray(applicableBrands) ? applicableBrands : [],
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });
};

const updateOfferService = async (id, data) => {
  const offer = await findOfferById(id);
  if (!offer) {
    throw new Error("Offer not found");
  }

  if (data.discountValue !== undefined) {
    if (isNaN(Number(data.discountValue)) || Number(data.discountValue) <= 0) {
      throw new Error("Valid positive discount percentage is required");
    }
    if (Number(data.discountValue) > 90) {
      throw new Error("Discount percentage cannot exceed 90%");
    }
    data.discountValue = Number(data.discountValue);
  }

  data.discountType = "Percentage";

  if (data.startDate) data.startDate = new Date(data.startDate);

  if (data.endDate) data.endDate = new Date(data.endDate);

  return await updateOffer(id, data);
};

const deleteOfferService = async (id) => {
  const offer = await findOfferById(id);
  if (!offer) {
    throw new Error("Offer not found");
  }
  return await deleteOffer(id);
};

const toggleOfferStatusService = async (id) => {
  const offer = await findOfferById(id);
  if (!offer) {
    throw new Error("Offer not found");
  }
  offer.isActive = !offer.isActive;
  await offer.save();
  return offer;
};

const listOffersService = async (filters) => {
  return await listOffers(filters);
};

const getOfferByIdService = async (id) => {
  const offer = await findOfferById(id);
  if (!offer) {
    throw new Error("Offer not found");
  }
  return offer;
};

module.exports = {
  calculateBestProductOffer,
  createOfferService,
  updateOfferService,
  deleteOfferService,
  toggleOfferStatusService,
  listOffersService,
  getOfferByIdService,
  findActiveOffers,
};
