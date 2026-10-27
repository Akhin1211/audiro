const {
  validateAndApplyCouponService,
  createCouponService,
  updateCouponService,
  deleteCouponService,
  toggleCouponStatusService,
  listCouponsService,
  getCouponByIdService,
  getActiveCouponsForUserService,
} = require("../services/coupon.service.js");

const getAvailableCouponsUser = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    const coupons = await getActiveCouponsForUserService(userId);
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const applyCouponUser = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    if (!subtotal || isNaN(Number(subtotal)) || Number(subtotal) <= 0) {
      return res.status(400).json({ success: false, message: "Valid cart subtotal is required" });
    }

    const result = await validateAndApplyCouponService({
      code,
      subtotal: Number(subtotal),
      userId,
    });

    res.status(200).json({
      success: true,
      message: `Coupon '${result.code}' applied successfully!`,
      coupon: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAdminCoupons = async (req, res) => {
  try {
    const result = await listCouponsService(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdminCoupon = async (req, res) => {
  try {
    const coupon = await createCouponService(req.body);
    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAdminCouponById = async (req, res) => {
  try {
    const coupon = await getCouponByIdService(req.params.id);
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const updateAdminCoupon = async (req, res) => {
  try {
    const coupon = await updateCouponService(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAdminCoupon = async (req, res) => {
  try {
    await deleteCouponService(req.params.id);
    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleAdminCouponStatus = async (req, res) => {
  try {
    const coupon = await toggleCouponStatusService(req.params.id);
    res.status(200).json({
      success: true,
      message: `Coupon status updated to ${coupon.isActive ? "Active" : "Inactive"}`,
      coupon,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAvailableCouponsUser,
  applyCouponUser,
  getAdminCoupons,
  createAdminCoupon,
  getAdminCouponById,
  updateAdminCoupon,
  deleteAdminCoupon,
  toggleAdminCouponStatus,
};
