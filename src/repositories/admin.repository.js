const Admin = require("../models/admin.model.js");
const User = require("../models/user.model.js");

const findAdminByEmail = async (email) => {
  return await Admin.findOne({ email });
};

const findUsers = async (search, skip, limit) => {
  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  return await User.find(query)
    .select("-password -otp -otpExpiresAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

const countUsers = async (search) => {
  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  return await User.countDocuments(query);
};

const findUserById = async (userId) => {
  return await User.findById(userId);
};

const updateUserBlockStatus = async (userId, isBlocked) => {
  return await User.findByIdAndUpdate(
    userId,
    { isBlocked },
    {returnDocument: "after" }
  );
};

module.exports = {
  findAdminByEmail,
  findUsers,
  countUsers,
  findUserById,
  updateUserBlockStatus,
};