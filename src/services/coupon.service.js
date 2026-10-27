const {
  createCoupon,
  findCouponByCode,
  findCouponById,
  updateCoupon,
  deleteCoupon,
  listCoupons,
  incrementCouponUsage,
  findActiveCouponsForUser,
} = require("../repositories/coupon.repository.js");

const validateAndApplyCouponService = async ({ code, subtotal, userId }) => {
  if (!code || !code.trim()) {
    throw new Error("Coupon code is required");
  }

  const coupon = await findCouponByCode(code);
  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  if (!coupon.isActive) {
    throw new Error("This coupon is currently inactive");
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    throw new Error("This coupon campaign has not started yet");
  }

  if (new Date(coupon.expiryDate) < now) {
    throw new Error("This coupon has expired");
  }

  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    throw new Error(
      `Minimum order value of ₹${coupon.minOrderValue.toLocaleString(
        "en-IN"
      )} required to use this coupon`
    );
  }

  if (!coupon.isUnlimited && coupon.usedCount >= coupon.totalUsageLimit) {
    throw new Error("This coupon has reached its total usage limit");
  }

  if (userId) {
    const userUsage = coupon.usedBy.find(
      (u) => u.user && u.user.toString() === userId.toString()
    );
    if (userUsage && userUsage.count >= coupon.limitPerUser) {
      throw new Error(`You have reached the maximum usage limit (${coupon.limitPerUser}) for this coupon`);
    }
  }

  let discountAmount = 0;
  if (coupon.discountType === "Percentage") {
    discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else {
    discountAmount = Math.round(Number(coupon.discountValue));
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    code: coupon.code,
    couponId: coupon._id,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    minOrderValue: coupon.minOrderValue,
  };
};

const createCouponService = async (data) => {
  const {
    code,
    discountType,
    discountValue,
    minOrderValue,
    totalUsageLimit,
    isUnlimited,
    limitPerUser,
    startDate,
    expiryDate,
    internalNotes,
    isActive,
  } = data;

  if (!code || !code.trim()) {
    throw new Error("Coupon code is required");
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await findCouponByCode(cleanCode);
  if (existing) {
    throw new Error(`Coupon with code '${cleanCode}' already exists`);
  }

  if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
    throw new Error("Valid positive discount amount is required");
  }

  if (!expiryDate) {
    throw new Error("Expiry date is required");
  }

  return await createCoupon({
    code: cleanCode,
    discountType: "Flat Discount",
    discountValue: Number(discountValue),
    minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
    totalUsageLimit: isUnlimited ? 0 : Number(totalUsageLimit) || 100,
    isUnlimited: Boolean(isUnlimited),
    limitPerUser: Number(limitPerUser) || 1,
    startDate: startDate ? new Date(startDate) : new Date(),
    expiryDate: new Date(expiryDate),
    internalNotes: internalNotes || "",
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });
};


const updateCouponService = async (id, data) => {
  const coupon = await findCouponById(id);
  if (!coupon) {
    throw new Error("Coupon not found");
  }

  if (data.code) {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = await findCouponByCode(cleanCode);
    if (existing && existing._id.toString() !== id.toString()) {
      throw new Error(`Coupon with code '${cleanCode}' already exists`);
    }
    data.code = cleanCode;
  }

  if (data.discountValue !== undefined) {
    if (isNaN(Number(data.discountValue)) || Number(data.discountValue) <= 0) {
      throw new Error("Valid positive discount amount is required");
    }
    data.discountValue = Number(data.discountValue);
  }

  data.discountType = "Flat Discount";

  if (data.minOrderValue !== undefined) {
    data.minOrderValue = Number(data.minOrderValue);
  }

  if (data.limitPerUser !== undefined) {
    data.limitPerUser = Number(data.limitPerUser);
  }

  return await updateCoupon(id, data);
};


const deleteCouponService = async (id) => {
  const coupon = await findCouponById(id);
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  return await deleteCoupon(id);
};

const toggleCouponStatusService = async (id) => {
  const coupon = await findCouponById(id);
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return coupon;
};

const listCouponsService = async (filters) => {
  return await listCoupons(filters);
};

const getCouponByIdService = async (id) => {
  const coupon = await findCouponById(id);
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  return coupon;
};

const getActiveCouponsForUserService = async (userId) => {
  const coupons = await findActiveCouponsForUser();
  return coupons.map((c) => {
    let hasExceededUserLimit = false;
    if (userId && c.usedBy) {
      const usage = c.usedBy.find(
        (u) => u.user && u.user.toString() === userId.toString()
      );
      if (usage && usage.count >= c.limitPerUser) {
        hasExceededUserLimit = true;
      }
    }

    return {
      _id: c._id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValue: c.minOrderValue || 0,
      maxDiscountAmount: c.maxDiscountAmount || 0,
      expiryDate: c.expiryDate,
      startDate: c.startDate,
      internalNotes: c.internalNotes || "",
      limitPerUser: c.limitPerUser,
      isUsedByUser: hasExceededUserLimit,
    };
  });
};

module.exports = {
  validateAndApplyCouponService,
  createCouponService,
  updateCouponService,
  deleteCouponService,
  toggleCouponStatusService,
  listCouponsService,
  getCouponByIdService,
  getActiveCouponsForUserService,
  incrementCouponUsage,
};
