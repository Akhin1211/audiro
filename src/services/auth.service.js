const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail.js");
const { OAuth2Client } = require("google-auth-library");
const {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findUserByReferralCode,
  findUserByGoogleId,
  updateUserGoogleId,
  createUser,
  updateUserOTP,
  incrementUserOTPAttempts,
  clearUserOTP,
  setResetPasswordToken,
  clearResetPasswordToken,
  findUserByResetToken,
  updateUserPassword,
} = require("../repositories/user.repository.js");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getOtpExpiryDate = () => {
  const minutes = parseInt(process.env.OTP_EXPIRES_IN_MINUTES, 10) || 5;
  return new Date(Date.now() + minutes * 60 * 1000);
};

const getResetTokenExpiryDate = () => {
  const minutes =
    parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES, 10) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

const generateSecureOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Signup
const signupService = async ({
  username,
  email,
  password,
  confirmPassword,
  referralCode,
}) => {
  if (!username || !email || !password) {
    throw new Error("All fields are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.trim();

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error("Please enter a valid email address");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (normalizedUsername.length < 3) {
    throw new Error("Username must be at least 3 characters");
  }

  if (normalizedUsername.length > 50) {
    throw new Error("Username cannot exceed 50 characters");
  }

  // Name must only contain letters, spaces, apostrophes, and hyphens (standard human name format)
  const nameRegex = /^[a-zA-Z]+([ '.-][a-zA-Z]+)*$/;
  if (!nameRegex.test(normalizedUsername)) {
    throw new Error("Username must be a valid name (letters only; symbols like -_@ are not allowed)");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }


  const existingUsername = await findUserByUsername(normalizedUsername);
  if (existingUsername) {
    throw new Error("Username already taken");
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    if (!existingUser.isVerified) {
      // User registered earlier but never verified: generate new secure OTP
      const otp = generateSecureOTP();
      const otpExpiresAt = getOtpExpiryDate();
      await updateUserOTP(existingUser._id, otp, otpExpiresAt);
      await sendEmail(normalizedEmail, otp);
      return {
        message: "User registered. Please verify the OTP sent to your email",
      };
    }
    throw new Error("Email already registered");
  }

  // Generate unique referral code for this user
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const generatedCode = `AUD-${randomSuffix}`;

  // Link referrer if valid referral code provided
  let referrerId = null;
  if (referralCode && referralCode.trim()) {
    const referrer = await findUserByReferralCode(referralCode.trim());
    if (referrer) {
      referrerId = referrer._id;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateSecureOTP();
  const otpExpiresAt = getOtpExpiryDate();

  await createUser({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    otp,
    otpExpiresAt,
    otpAttempts: 0,
    referralCode: generatedCode,
    referredBy: referrerId,
  });

  await sendEmail(normalizedEmail, otp);

  return {
    message: "User registered successfully",
  };
};

// Verify Signup OTP
const verifyOTPService = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new Error("OTP is not available. Please request a new OTP");
  }

  if (user.otpAttempts >= 5) {
    await clearUserOTP(user._id);
    throw new Error("Maximum OTP verification attempts exceeded. Please request a new OTP");
  }

  if (user.otpExpiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (String(user.otp) !== String(otp).trim()) {
    await incrementUserOTPAttempts(user._id);
    const remaining = 5 - (user.otpAttempts + 1);
    throw new Error(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempts remaining.`
        : "Invalid OTP. Maximum attempts reached. Please request a new OTP."
    );
  }

  await clearUserOTP(user._id, true);

  return "Email verified successfully";
};

// Resend OTP
const resendOTPService = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isVerified) {
    throw new Error("User already verified");
  }

  const otp = generateSecureOTP();
  const otpExpiresAt = getOtpExpiryDate();

  await updateUserOTP(user._id, otp, otpExpiresAt);
  await sendEmail(normalizedEmail, otp);

  return "OTP resend successfully";
};

// Login
const loginService = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.isBlocked) {
    throw new Error("Your account has been blocked");
  }

  if (!user.isVerified) {
    throw new Error("Please verify your email first");
  }

  // Handle Google-only accounts trying password login
  if (!user.password && user.authProvider === "google") {
    throw new Error(
      "This account was registered using Google. Please sign in with Google."
    );
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password || "");

  if (!isPasswordCorrect) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  };
};

// Forgot Password
const forgotPasswordService = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    // Avoid user enumeration
    return "If an account exists with this email, a password reset OTP has been sent.";
  }

  if (user.isBlocked) {
    throw new Error("Your account has been blocked");
  }

  const otp = generateSecureOTP();
  const otpExpiresAt = getOtpExpiryDate();

  await updateUserOTP(user._id, otp, otpExpiresAt);
  await sendEmail(normalizedEmail, otp);

  return "Password reset OTP sent successfully";
};

// Verify Forgot Password OTP -> Generates secure single-use reset token
const verifyForgotOTPService = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isBlocked) {
    throw new Error("Your account has been blocked");
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new Error("OTP is not available. Please request a new OTP");
  }

  if (user.otpAttempts >= 5) {
    await clearUserOTP(user._id);
    throw new Error("Maximum OTP attempts exceeded. Please request a new OTP");
  }

  if (user.otpExpiresAt < new Date()) {
    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (String(user.otp) !== String(otp).trim()) {
    await incrementUserOTPAttempts(user._id);
    const remaining = 5 - (user.otpAttempts + 1);
    throw new Error(
      remaining > 0
        ? `Invalid OTP. ${remaining} attempts remaining.`
        : "Invalid OTP. Maximum attempts reached. Please request a new OTP."
    );
  }

  // Generate cryptographically secure, single-use reset token
  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const hashedResetToken = hashToken(rawResetToken);
  const resetTokenExpiresAt = getResetTokenExpiryDate();

  await setResetPasswordToken(user._id, hashedResetToken, resetTokenExpiresAt);

  return {
    message: "OTP verified successfully",
    resetToken: rawResetToken,
  };
};

// Reset Password -> Requires valid raw reset token
const resetPasswordService = async (
  email,
  resetToken,
  newPassword,
  confirmPassword
) => {
  if (!resetToken) {
    throw new Error("Password reset token is required. Please verify OTP first.");
  }

  if (!newPassword || !confirmPassword) {
    throw new Error("New password and confirm password are required");
  }

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const hashedResetToken = hashToken(resetToken);
  const user = await findUserByResetToken(hashedResetToken);

  if (!user) {
    throw new Error("Invalid or expired password reset token. Please request a new OTP.");
  }

  if (email && user.email !== email.toLowerCase().trim()) {
    throw new Error("Reset token does not match the provided email.");
  }

  if (user.isBlocked) {
    throw new Error("Your account has been blocked");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await updateUserPassword(user._id, hashedPassword);
  // Invalidate and consume the reset token immediately
  await clearResetPasswordToken(user._id);

  return "Password reset successfully";
};

// Google Login
const googleLoginService = async (credential) => {
  if (!credential) {
    throw new Error("Google credential is required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  const {
    email,
    email_verified,
    name,
    picture,
    sub: googleId,
  } = payload;

  if (!email) {
    throw new Error("Google account email not found");
  }

  if (!email_verified) {
    throw new Error("Google account email is not verified");
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if Google account already exists
  let user = await findUserByGoogleId(googleId);

  // If not, check whether the email already exists
  if (!user) {
    user = await findUserByEmail(normalizedEmail);
  }

  // Existing user
  if (user) {
    if (user.isBlocked) {
      throw new Error("Your account has been blocked");
    }

    if (!user.googleId) {
      user = await updateUserGoogleId(user._id, googleId);
    }
  }

  // New Google user
  if (!user) {
    let username = normalizedEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 20);

    if (!username) {
      username = "user";
    }

    let originalUsername = username;
    let count = 1;

    while (await findUserByUsername(username)) {
      username = `${originalUsername}${count}`;
      count++;
    }

    user = await createUser({
      username,
      email: normalizedEmail,
      googleId,
      authProvider: "google",
      profileImage: picture || "",
      isVerified: true,
      otpAttempts: 0,
      profile: {
        firstName: name || "",
      },
    });
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
    },
  };
};

module.exports = {
  signupService,
  verifyOTPService,
  resendOTPService,
  loginService,
  forgotPasswordService,
  verifyForgotOTPService,
  resetPasswordService,
  googleLoginService,
};