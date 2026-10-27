const Coupon = require("../models/coupon.model.js");

const createCoupon = async (data) => {
  return await Coupon.create(data);
};

const findCouponByCode = async (code) => {
  return await Coupon.findOne({
    code: code.trim().toUpperCase(),
    isDeleted: false,
  });
};

const findCouponById = async (id) => {
  return await Coupon.findOne({ _id: id, isDeleted: false });
};

const updateCoupon = async (id, data) => {
  return await Coupon.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true });
};

const deleteCoupon = async (id) => {
  return await Coupon.findOneAndUpdate(
    { _id: id },
    { isDeleted: true, isActive: false },
    { new: true }
  );
};

const listCoupons = async ({ search = "", type = "", status = "", page = 1, limit = 10 }) => {
  const query = { isDeleted: false };

  if (search) {
    query.code = { $regex: search, $options: "i" };
  }

  if (type && type !== "All") {
    query.discountType = type;
  }

  const now = new Date();
  const normalizedStatus = status ? status.toLowerCase() : "";
  if (normalizedStatus === "active") {
    query.isActive = true;
    query.expiryDate = { $gte: now };
  } else if (normalizedStatus === "expired") {
    query.expiryDate = { $lt: now };
  } else if (normalizedStatus === "disabled" || normalizedStatus === "inactive") {
    query.isActive = false;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const coupons = await Coupon.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Coupon.countDocuments(query);

  return {
    coupons,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

const incrementCouponUsage = async (couponId, userId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return null;

  coupon.usedCount += 1;
  const userUsageIndex = coupon.usedBy.findIndex(
    (u) => u.user && u.user.toString() === userId.toString()
  );

  if (userUsageIndex > -1) {
    coupon.usedBy[userUsageIndex].count += 1;
  } else {
    coupon.usedBy.push({ user: userId, count: 1 });
  }

  await coupon.save();
  return coupon;
};

const findActiveCouponsForUser = async () => {
  const now = new Date();
  return await Coupon.find({
    isDeleted: false,
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    $or: [
      { isUnlimited: true },
      { $expr: { $lt: ["$usedCount", "$totalUsageLimit"] } },
    ],
  }).sort({ discountValue: -1, createdAt: -1 });
};

module.exports = {
  createCoupon,
  findCouponByCode,
  findCouponById,
  updateCoupon,
  deleteCoupon,
  listCoupons,
  incrementCouponUsage,
  findActiveCouponsForUser,
};
