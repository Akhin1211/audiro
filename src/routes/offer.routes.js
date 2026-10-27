const express = require("express");
const { getActiveOffersUser } = require("../controllers/offer.controller.js");

const router = express.Router();

// User Active Promotional Offers
router.get("/active", getActiveOffersUser);

module.exports = router;
