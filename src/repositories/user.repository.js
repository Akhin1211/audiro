const User = require("../models/user.model.js");

const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

const findUserByUsername = async (username) => {
  return await User.findOne({ username });
};

const findUserById = async (userId) => {
  return await User.findById(userId);
};

const findUserByReferralCode = async (code) => {
  if (!code) return null;
  return await User.findOne({ referralCode: code.trim().toUpperCase() });
};

const createUser = async (userData) => {
  return await User.create(userData);
};

const updateUserProfile = async (userId, data) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      "profile.firstName": data.firstName,
      "profile.lastName": data.lastName,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      country: data.country,
    },
    { returnDocument: "after"}
  );
};

const addUserAddress = async (userId, addressData) => {
  return await User.findByIdAndUpdate(
    userId,
    { $push: { addresses: addressData } },
    {returnDocument: "after" }
  );
};

const getUserAddresses = async (userId) => {
  return await User.findById(userId).select("addresses");
};

const updateUserAddress = async (userId, addressId, data) => {
  return await User.findOneAndUpdate(
    { _id: userId, "addresses._id": addressId },
    {
      $set: {
        "addresses.$.name": data.name,
        "addresses.$.phone": data.phone,
        "addresses.$.addressLine": data.addressLine,
        "addresses.$.city": data.city,
        "addresses.$.state": data.state,
        "addresses.$.pincode": data.pincode,
      },
    },
    { returnDocument: "after"}
  );
};

const removeUserAddress = async (userId, addressId) => {
  return await User.findByIdAndUpdate(
    userId,
    { $pull: { addresses: { _id: addressId } } },
    { returnDocument: "after" }
  );
};

const setDefaultUserAddress = async (userId, addressId) => {
  const user = await User.findById(userId);

  if (!user) return null;

  const address = user.addresses.id(addressId);

  if (!address) return null;

  user.addresses.forEach((address) => {
    address.isDefault = false;
  });

  address.isDefault = true;

  return await user.save();
};

const updateUserPassword = async (userId, password) => {
  return await User.findByIdAndUpdate(userId, { password });
};

const updateEmailChangeRequest = async (
  userId,
  pendingEmail,
  otp,
  otpExpiresAt
) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      pendingEmail,
      otp,
      otpExpiresAt,
    },
    { returnDocument: "after" }
  );
};

const completeEmailChange = async (userId) => {
  const user = await User.findById(userId);

  if (!user) return null;

  user.email = user.pendingEmail;
  user.pendingEmail = "";
  user.otp = "";
  user.otpExpiresAt = null;

  return await user.save();
};

const updateProfileImage = async (userId, profileImage) => {
  return await User.findByIdAndUpdate(
    userId,
    { profileImage },
    { returnDocument: "after"}
  );
};
const updateUserOTP = async (userId, otp, otpExpiresAt) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      otp,
      otpExpiresAt,
      otpAttempts: 0,
    },
    { returnDocument: "after" }
  );
};

const incrementUserOTPAttempts = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    { $inc: { otpAttempts: 1 } },
    { returnDocument: "after" }
  );
};

const clearUserOTP = async (userId, verify = false) => {
  const update = {
    otp: "",
    otpExpiresAt: null,
    otpAttempts: 0,
  };

  if (verify) {
    update.isVerified = true;
  }

  return await User.findByIdAndUpdate(
    userId,
    update,
    { returnDocument: "after" }
  );
};

const setResetPasswordToken = async (userId, hashedToken, expiresAt) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiresAt: expiresAt,
      otp: "",
      otpExpiresAt: null,
      otpAttempts: 0,
    },
    { returnDocument: "after" }
  );
};

const clearResetPasswordToken = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      resetPasswordToken: "",
      resetPasswordTokenExpiresAt: null,
    },
    { returnDocument: "after" }
  );
};

const findUserByResetToken = async (hashedToken) => {
  return await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordTokenExpiresAt: { $gt: new Date() },
  });
};
const findUserByGoogleId = async (googleId) => {
  return await User.findOne({ googleId });
};

const updateUserGoogleId = async (userId, googleId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      googleId,
      isVerified: true,
    },
    { returnDocument: "after" }
  );
};
const removeProfileImage = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    { profileImage: "" },
    { returnDocument: "after"}
  );
};

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findUserByReferralCode,
  createUser,
  findUserByGoogleId,
  updateUserGoogleId,
  updateUserProfile,
  addUserAddress,
  getUserAddresses,
  updateUserAddress,
  removeUserAddress,
  setDefaultUserAddress,
  updateUserPassword,
  updateEmailChangeRequest,
  completeEmailChange,
  updateProfileImage,
  updateUserOTP,
  incrementUserOTPAttempts,
  clearUserOTP,
  setResetPasswordToken,
  clearResetPasswordToken,
  findUserByResetToken,
  removeProfileImage,
};