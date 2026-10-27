const express=require("express");
const {getProfile,
    editProfile,
    addAddress,
    editAddress,
    getAddress,
deleteAddress,
setdefaultAddress,
changePassword,
requestEmailChange,
verifyEmailChangeOTP,
uploadProfileImage,
removeProfileImage
}=require("../controllers/user.controller.js");
const upload=require("../middleware/upload.middleware.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const router = express.Router();

router.use(authMiddleware);

router.get("/profile", getProfile);
router.put("/profile", editProfile);
router.post("/address", addAddress);
router.get("/address", getAddress);
router.put("/address/:addressId", editAddress);
router.delete("/address/:addressId", deleteAddress);
router.patch("/address/:addressId/default", setdefaultAddress);
router.put("/change-password", changePassword);
router.post("/email-change", requestEmailChange);
router.patch("/email-change/verify", verifyEmailChangeOTP);
router.post("/profile/image", upload.single("profileImage"), uploadProfileImage);
router.put("/profile/image", upload.single("profileImage"), uploadProfileImage);
router.delete("/profile/image", removeProfileImage);

module.exports = router;
