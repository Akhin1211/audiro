const HTTP_STATUS = require("../constants/httpStatus.js");
const {
  getProfileService,
  editProfileService,
  addAddressService,
  getAddressService,
  editAddressService,
  deleteAddressService,
  setDefaultAddressService,
  changePasswordService,
  requestEmailChangeService,
  verifyEmailChangeOTPService,
  uploadProfileImageService,
  removeProfileImageService,
} = require("../services/user.service.js");

// Get Profile
const getProfile = async (req, res) => {
  try {
    const user = await getProfileService(req.userId);
    res.status(HTTP_STATUS.OK).json(user);
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message });
  }
};

// Edit Profile
const editProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      country,
    } = req.body;

    const user = await editProfileService(
      req.userId,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      country
    );

    return res.status(HTTP_STATUS.OK).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

// Add Address
const addAddress = async (req, res) => {
  try {
    const addresses = await addAddressService(req.userId, req.body);

    res.status(HTTP_STATUS.CREATED).json({
      message: "Address added successfully",
      addresses,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

// Get Address
const getAddress = async (req, res) => {
  try {
    const addresses = await getAddressService(req.userId);

    res.status(HTTP_STATUS.OK).json({
      message: "Addresses fetched successfully",
      addresses,
    });
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message });
  }
};

// Edit Address
const editAddress = async (req, res) => {
  try {
    const addresses = await editAddressService(
      req.userId,
      req.params.addressId,
      req.body
    );

    res.status(HTTP_STATUS.OK).json({
      message: "Address updated successfully",
      addresses,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete Address
const deleteAddress = async (req, res) => {
  try {
    const addresses = await deleteAddressService(
      req.userId,
      req.params.addressId
    );

    res.status(HTTP_STATUS.OK).json({
      message: "Address deleted successfully",
      addresses,
    });
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message });
  }
};

// Set Default Address
const setdefaultAddress = async (req, res) => {
  try {
    const addresses = await setDefaultAddressService(
      req.userId,
      req.params.addressId
    );

    res.status(HTTP_STATUS.OK).json({
      message: "Default address updated successfully",
      addresses,
    });
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    await changePasswordService(
      req.userId,
      req.body.currentPassword,
      req.body.newPassword,
      req.body.confirmPassword
    );

    res.status(HTTP_STATUS.OK).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

// Request Email Change
const requestEmailChange = async (req, res) => {
  try {
    await requestEmailChangeService(req.userId, req.body.newEmail);

    res.status(HTTP_STATUS.OK).json({
      message: "Email change OTP sent successfully",
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

// Verify Email Change OTP
const verifyEmailChangeOTP = async (req, res) => {
  try {
    const email = await verifyEmailChangeOTPService(
      req.userId,
      req.body.otp
    );

    res.status(HTTP_STATUS.OK).json({
      message: "Email changed successfully",
      email,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

// Upload Profile Image
const uploadProfileImage = async (req, res) => {
  try {
    const user = await uploadProfileImageService(
      req.userId,
      req.file
    );

    return res.status(HTTP_STATUS.OK).json({
      message: "Profile image updated successfully",
      user,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

const removeProfileImage = async (req, res) => {
  try {
    const user = await removeProfileImageService(req.userId);

    return res.status(HTTP_STATUS.OK).json({
      message: "Profile image removed successfully",
      user,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

module.exports = {
  getProfile,
  editProfile,
  addAddress,
  getAddress,
  editAddress,
  deleteAddress,
  setdefaultAddress,
  changePassword,
  requestEmailChange,
  verifyEmailChangeOTP,
  uploadProfileImage,
  removeProfileImage,
};