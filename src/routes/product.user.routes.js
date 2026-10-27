const express = require("express");
const {
  getPublicProducts,
  getPublicProductDetail,
  getFilterMeta,
} = require("../controllers/product.user.controller.js");

const router = express.Router();

router.get("/meta/filters", getFilterMeta);
router.get("/", getPublicProducts);
router.get("/:id", getPublicProductDetail);

module.exports = router;
