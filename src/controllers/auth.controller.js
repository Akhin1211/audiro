const HTTP_STATUS = require("../constants/httpStatus.js");
const {
  signupService,
  verifyOTPService,
  resendOTPService,
  loginService,
  forgotPasswordService,
  verifyForgotOTPService,
  resetPasswordService,
  googleLoginService,
} = require("../services/auth.service.js");

// Signup
const signup = async (req, res) => {
  try {
    const result = await signupService(req.body);

    return res.status(HTTP_STATUS.CREATED).json(result);
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

// Verify Signup OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const message = await verifyOTPService(email, otp);

    return res.status(HTTP_STATUS.OK).json({
      message,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const message = await resendOTPService(email);

    return res.status(HTTP_STATUS.OK).json({
      message,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);

    return res.status(HTTP_STATUS.OK).json({
      message: "Login successfully",
      ...result,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: error.message,
    });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const message = await forgotPasswordService(email);

    return res.status(HTTP_STATUS.OK).json({
      message,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

// Verify Forgot Password OTP
const verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyForgotOTPService(email, otp);

    return res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const {
      email,
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body;

    const message = await resetPasswordService(
      email,
      resetToken,
      newPassword,
      confirmPassword
    );

    return res.status(HTTP_STATUS.OK).json({
      message,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    const result = await googleLoginService(credential);

    return res.status(HTTP_STATUS.OK).json({
      message: "Google login successful",
      ...result,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message,
    });
  }
};
module.exports = {
  signup,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  googleLogin,
};