const {
  getPublicProductsService,
  getPublicProductDetailService,
  getFilterMetaService,
} = require("../services/product.user.service.js");

const getPublicProducts = async (req, res) => {
  try {
    const result = await getPublicProductsService(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicProductDetail = async (req, res) => {
  try {
    const result = await getPublicProductDetailService(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const getFilterMeta = async (req, res) => {
  try {
    const result = await getFilterMetaService();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicProducts,
  getPublicProductDetail,
  getFilterMeta,
};
