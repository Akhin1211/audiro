const bcrypt = require("bcrypt");
const sendEmail = require("../utils/sendEmail.js");

const {
  findUserById,
  findUserByEmail,
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
  removeProfileImage,

} = require("../repositories/user.repository.js");

const getProfileService = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const editProfileService = async (
  userId,
  firstName,
  lastName,
  phone,
  dateOfBirth,
  gender,
  country
) => {
  if (!firstName || !phone) {
    throw new Error("First name and phone are required");
  }

  const nameRegex = /^[a-zA-Z]+([ '.-][a-zA-Z]+)*$/;
  const trimmedFirst = firstName.trim();
  if (trimmedFirst.length < 2 || trimmedFirst.length > 50 || !nameRegex.test(trimmedFirst)) {
    throw new Error("First name must be a valid name (letters only; symbols like -_@ are not allowed)");
  }

  if (lastName && lastName.trim()) {
    const trimmedLast = lastName.trim();
    if (trimmedLast.length > 50 || !nameRegex.test(trimmedLast)) {
      throw new Error("Last name must be a valid name (letters only; symbols like -_@ are not allowed)");
    }
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new Error("Phone number must be 10 digits");
  }

  if (!dateOfBirth) {
    throw new Error("Date of birth is required");
  }

  const birthDate = new Date(dateOfBirth);

  if (isNaN(birthDate.getTime())) {
    throw new Error("Invalid date of birth");
  }

  if (birthDate > new Date()) {
    throw new Error("Date of birth cannot be in the future");
  }

  if (!gender) {
    throw new Error("Gender is required");
  }

  if (!country) {
    throw new Error("Country is required");
  }

  const user = await updateUserProfile(userId, {
    firstName: trimmedFirst,
    lastName: lastName ? lastName.trim() : "",
    phone,
    dateOfBirth,
    gender,
    country,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const addAddressService = async (userId, addressData) => {
  const {
    name,
    phone,
    addressLine,
    city,
    state,
    pincode,
  } = addressData;

  if (!name || !phone || !addressLine || !city || !state || !pincode) {
    throw new Error("All address fields are required");
  }

  const nameRegex = /^[a-zA-Z]+([ '.-][a-zA-Z]+)*$/;
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 60 || !nameRegex.test(trimmedName)) {
    throw new Error("Full name must be a valid name (letters only; symbols like -_@ are not allowed)");
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new Error("Phone number must be 10 digits");
  }

  if (!/^\d{6}$/.test(pincode)) {
    throw new Error("Pincode must be 6 digits");
  }

  const user = await addUserAddress(userId, {
    ...addressData,
    name: trimmedName,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user.addresses;
};

const getAddressService = async (userId) => {
  const user = await getUserAddresses(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user.addresses;
};

const editAddressService = async (userId, addressId, addressData) => {
  const {
    name,
    phone,
    addressLine,
    city,
    state,
    pincode,
  } = addressData;

  if (!name || !phone || !addressLine || !city || !state || !pincode) {
    throw new Error("All address fields are required");
  }

  const nameRegex = /^[a-zA-Z]+([ '.-][a-zA-Z]+)*$/;
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 60 || !nameRegex.test(trimmedName)) {
    throw new Error("Full name must be a valid name (letters only; symbols like -_@ are not allowed)");
  }


  if (!/^\d{10}$/.test(phone)) {
    throw new Error("Phone number must be 10 digits");
  }

  if (!/^\d{6}$/.test(pincode)) {
    throw new Error("Pincode must be 6 digits");
  }

  const user = await updateUserAddress(userId, addressId, {
    ...addressData,
    name: trimmedName,
  });


  if (!user) {
    throw new Error("User or address not found");
  }

  return user.addresses;
};

const deleteAddressService = async (userId, addressId) => {
  const user = await removeUserAddress(userId, addressId);

  if (!user) {
    throw new Error("User or address not found");
  }

  return user.addresses;
};

const setDefaultAddressService = async (userId, addressId) => {
  const user = await setDefaultUserAddress(userId, addressId);

  if (!user) {
    throw new Error("User or address not found");
  }

  return user.addresses;
};

const changePasswordService = async (
  userId,
  currentPassword,
  newPassword,
  confirmPassword
) => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error("All password fields are required");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New passwords do not match");
  }

  const user = await findUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await updateUserPassword(userId, hashedPassword);
};

const requestEmailChangeService = async (userId, newEmail) => {
  if (!newEmail) {
    throw new Error("New email is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(newEmail)) {
    throw new Error("Invalid email format");
  }

  const existingUser = await findUserByEmail(newEmail);

  if (existingUser) {
    throw new Error("Email is already in use");
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const user = await updateEmailChangeRequest(
    userId,
    newEmail,
    otp.toString(),
    otpExpiresAt
  );

  if (!user) {
    throw new Error("User not found");
  }

  await sendEmail(newEmail, otp);
};

const verifyEmailChangeOTPService = async (userId, otp) => {
  if (!otp) {
    throw new Error("OTP is required");
  }

  const user = await findUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.pendingEmail) {
    throw new Error("No email change request found");
  }

  if (user.otp !== String(otp)) {
    throw new Error("Invalid OTP");
  }

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new Error("OTP has expired");
  }

  const updatedUser = await completeEmailChange(userId);

  return updatedUser.email;
};

const uploadProfileImageService = async (userId, file) => {
  if (!file) {
    throw new Error("Please select an image");
  }

  const imagePath = `/uploads/${file.filename}`;

  const user = await updateProfileImage(userId, imagePath);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const removeProfileImageService = async (userId) => {
  const user = await removeProfileImage(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

module.exports = {
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
};