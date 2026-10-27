const Order = require("../models/order.model.js");
const User = require("../models/user.model.js");

const createOrder = async (orderData) => {
  return await Order.create(orderData);
};

const findOrderById = async (id) => {
  return await Order.findById(id).populate("user", "username email phone profile");
};

const findOrderByOrderId = async (orderId) => {
  return await Order.findOne({ orderId }).populate(
    "user",
    "username email phone profile"
  );
};

const findOrdersByUserId = async (
  userId,
  { search = "", skip = 0, limit = 10, sort = "-createdAt" } = {}
) => {
  const query = { user: userId };

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { orderId: { $regex: s, $options: "i" } },
      { "items.name": { $regex: s, $options: "i" } },
      { "items.brand": { $regex: s, $options: "i" } },
    ];
  }

  return await Order.find(query).sort(sort).skip(skip).limit(limit);
};

const countOrdersByUserId = async (userId, { search = "" } = {}) => {
  const query = { user: userId };

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { orderId: { $regex: s, $options: "i" } },
      { "items.name": { $regex: s, $options: "i" } },
      { "items.brand": { $regex: s, $options: "i" } },
    ];
  }

  return await Order.countDocuments(query);
};

const updateOrderById = async (id, updateData) => {
  return await Order.findByIdAndUpdate(id, updateData, { new: true }).populate(
    "user",
    "username email phone profile"
  );
};

// Admin Order Queries
const buildAdminOrderQuery = async ({
  search = "",
  status = "",
  startDate = "",
  endDate = "",
}) => {
  const query = {};

  if (status && status !== "All") {
    query.orderStatus = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search && search.trim()) {
    const s = search.trim();

    // Find users matching search by username or email
    const matchingUsers = await User.find({
      $or: [
        { username: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { phone: { $regex: s, $options: "i" } },
        { "profile.firstName": { $regex: s, $options: "i" } },
        { "profile.lastName": { $regex: s, $options: "i" } },
      ],
    }).select("_id");

    const userIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { orderId: { $regex: s, $options: "i" } },
      { "shippingAddress.name": { $regex: s, $options: "i" } },
      { "shippingAddress.phone": { $regex: s, $options: "i" } },
      { "items.name": { $regex: s, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }

  return query;
};

const findAdminOrders = async ({
  search = "",
  status = "",
  startDate = "",
  endDate = "",
  sort = "-createdAt",
  skip = 0,
  limit = 10,
}) => {
  const query = await buildAdminOrderQuery({ search, status, startDate, endDate });

  const sortOptions = {};
  if (sort === "date_asc") sortOptions.createdAt = 1;
  else if (sort === "amount_desc") sortOptions["pricing.finalTotal"] = -1;
  else if (sort === "amount_asc") sortOptions["pricing.finalTotal"] = 1;
  else sortOptions.createdAt = -1; // Default: newest first

  return await Order.find(query)
    .populate("user", "username email phone profile")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
};

const countAdminOrders = async ({
  search = "",
  status = "",
  startDate = "",
  endDate = "",
}) => {
  const query = await buildAdminOrderQuery({ search, status, startDate, endDate });
  return await Order.countDocuments(query);
};

module.exports = {
  createOrder,
  findOrderById,
  findOrderByOrderId,
  findOrdersByUserId,
  countOrdersByUserId,
  updateOrderById,
  findAdminOrders,
  countAdminOrders,
};
