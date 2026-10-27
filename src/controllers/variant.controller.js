const {
  getVariantsService,
  createVariantService,
  updateVariantService,
  deleteVariantService,
  toggleVariantStatusService,
} = require("../services/variant.service.js");

const getAdminProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await getVariantsService(productId);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const createAdminProductVariant = async (req, res) => {
  try {
    const { productId } = req.params;

    let images = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (req.body.images) {
      if (Array.isArray(req.body.images)) {
        images = req.body.images;
      } else if (typeof req.body.images === "string") {
        try {
          images = JSON.parse(req.body.images);
        } catch (e) {
          images = [req.body.images];
        }
      }
    } else if (req.body.image) {
      images = [req.body.image];
    }

    const variantData = {
      ...req.body,
      images,
    };

    const result = await createVariantService(productId, variantData);
    res.status(201).json({
      message: "Variant created successfully",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateAdminProductVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const updateData = { ...req.body };

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
      let existingImages = [];
      if (req.body.existingImages) {
        try {
          existingImages = JSON.parse(req.body.existingImages);
        } catch (e) {
          existingImages = Array.isArray(req.body.existingImages) ? req.body.existingImages : [];
        }
      }
      updateData.images = [...existingImages, ...newImages];
    } else if (req.body.image && typeof req.body.image === "string") {
      updateData.images = [req.body.image];
    }

    const result = await updateVariantService(productId, variantId, updateData);
    res.status(200).json({
      message: "Variant updated successfully",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAdminProductVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const product = await deleteVariantService(productId, variantId);
    res.status(200).json({
      message: "Variant deleted successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const toggleAdminProductVariantStatus = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { isActive } = req.body;
    const result = await toggleVariantStatusService(productId, variantId, isActive);
    res.status(200).json({
      message: "Variant status updated successfully",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAdminProductVariants,
  createAdminProductVariant,
  updateAdminProductVariant,
  deleteAdminProductVariant,
  toggleAdminProductVariantStatus,
};
