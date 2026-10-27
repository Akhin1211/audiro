const express=require("express")
const {signup,
    verifyOTP,
    resendOTP,
    login,
forgotPassword,
verifyForgotOTP,
resetPassword,
googleLogin,}=require("../controllers/auth.controller.js")

const authMiddleware = require("../middleware/auth.middleware.js");





const router=express.Router();

router.get("/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "You can access this protected route",
    userId: req.userId,
  });
});


router.post("/signup",signup)
router.post("/verify-otp",verifyOTP)
router.post("/resend-otp",resendOTP)
router.post("/login",login)
router.post("/forgot-password",forgotPassword)
router.post("/verify-forgot-otp",verifyForgotOTP)
router.post("/reset-password", resetPassword);
router.post("/google",googleLogin)
module.exports=router