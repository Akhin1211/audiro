const express = require("express");
const { getUserWallet, topupWallet } = require("../controllers/wallet.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getUserWallet);
router.post("/topup", topupWallet);

module.exports = router;
