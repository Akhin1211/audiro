const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
  findAdminByEmail,
  findUsers,
  countUsers,
  findUserById,
  updateUserBlockStatus,
} = require("../repositories/admin.repository.js");

const adminLoginService = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const admin = await findAdminByEmail(email);

  if (!admin) {
    throw new Error("Admin not found");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    admin.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { adminId: admin._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  return {
    token,
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
    },
  };
};
//intrecepter//

const getAllUsersService = async (search, page = 1, limit = 5) => {
  const skip = (page - 1) * limit;

  const users = await findUsers(search, skip, limit);
  const totalUsers = await countUsers(search);

  return {
    users,
    currentPage: page,
    totalPages: Math.ceil(totalUsers / limit),
    totalUsers,
  };
};

const toggleUserBlockService = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const updatedUser = await updateUserBlockStatus(
    userId,
    !user.isBlocked
  );

  return updatedUser;
};

const Order = require("../models/order.model.js");
const Product = require("../models/product.model.js");

const getDashboardStatsService = async () => {

  // Aggregate sales by product and by category for non-cancelled orders
  const matchStage = {
    $match: {
      orderStatus: { $nin: ["Cancelled", "Returned"] },
    },
  };

  const [topProducts, topCategories, statusCounts, revenueAgg] = await Promise.all([
    // Top 5 selling products by quantity
    Order.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $match: {
          "items.status": { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          totalUnitsSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 6 },
    ]),

    // Top categories by revenue & units sold
    Order.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $match: {
          "items.status": { $ne: "Cancelled" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: "$productDoc" },
      {
        $lookup: {
          from: "categories",
          localField: "productDoc.category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$categoryDoc._id",
          name: { $first: { $ifNull: ["$categoryDoc.name", "General"] } },
          totalUnitsSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 6 },
    ]),

    // Order counts by status
    Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]),

    // Total actual revenue from non-cancelled orders
    Order.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.finalTotal" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const totalOrders = await Order.countDocuments();
  const pendingOrders = (
    statusCounts.find((s) => s._id === "Pending")?.count || 0
  ) + (statusCounts.find((s) => s._id === "Confirmed")?.count || 0);

  return {
    topProducts,
    topCategories,
    totalRevenue,
    totalOrders,
    pendingOrders,
    statusCounts,
  };
};

module.exports = {
  adminLoginService,
  getAllUsersService,
  toggleUserBlockService,
  getDashboardStatsService,
};