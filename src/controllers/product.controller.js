const {
  createProductService,
  updateProductService,
  getProductsService,
  getProductByIdService,
  deleteProductService,
  restoreProductService,
} = require("../services/product.service.js");

const createProduct = async (req, res) => {
  try {
    let images = [];
    let variantFilesMap = {};

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname.startsWith("variantImage_")) {
          const key = file.fieldname.replace("variantImage_", "");
          variantFilesMap[key] = `/uploads/${file.filename}`;
        } else {
          images.push(`/uploads/${file.filename}`);
        }
      });
    } else if (req.body.images && Array.isArray(req.body.images)) {
      images = req.body.images;
    } else if (typeof req.body.images === "string") {
      try {
        images = JSON.parse(req.body.images);
      } catch (e) {
        images = [req.body.images];
      }
    }

    let specifications = [];
    if (typeof req.body.specifications === "string") {
      try {
        specifications = JSON.parse(req.body.specifications);
      } catch (e) {
        specifications = [];
      }
    } else if (Array.isArray(req.body.specifications)) {
      specifications = req.body.specifications;
    }

    let colors = [];
    if (typeof req.body.colors === "string") {
      try {
        colors = JSON.parse(req.body.colors);
      } catch (e) {
        colors = req.body.colors.split(",").map((c) => c.trim());
      }
    } else if (Array.isArray(req.body.colors)) {
      colors = req.body.colors;
    }

    let variants = [];
    if (typeof req.body.variants === "string") {
      try {
        variants = JSON.parse(req.body.variants);
      } catch (e) {
        variants = [];
      }
    } else if (Array.isArray(req.body.variants)) {
      variants = req.body.variants;
    }

    if (Array.isArray(variants) && variants.length > 0) {
      variants = variants.map((v, index) => {
        let vImages = Array.isArray(v.images) ? [...v.images] : [];
        const uploadedImg =
          variantFilesMap[index] !== undefined
            ? variantFilesMap[index]
            : (v._id && variantFilesMap[v._id]) || (v.id && variantFilesMap[v.id]);

        if (uploadedImg) {
          vImages = [uploadedImg];
        } else if (v.imageIndex !== undefined && images[v.imageIndex]) {
          vImages = [images[v.imageIndex]];
        } else if (v.imageUrl) {
          vImages = [v.imageUrl];
        } else if (v.image) {
          vImages = [v.image];
        } else if (vImages.length === 0 && images.length > 0) {
          vImages = [images[0]];
        }
        return {
          ...v,
          price: Number(v.price) || 0,
          discountPrice: Number(v.discountPrice) || 0,
          stock: Number(v.stock) || 0,
          images: vImages,
          isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
        };
      });
    }

    const productData = {
      ...req.body,
      images,
      specifications,
      colors,
      variants,
    };

    const product = await createProductService(productData);
    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };
    let variantFilesMap = {};

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages = [];
      req.files.forEach((file) => {
        if (file.fieldname.startsWith("variantImage_")) {
          const key = file.fieldname.replace("variantImage_", "");
          variantFilesMap[key] = `/uploads/${file.filename}`;
        } else {
          newImages.push(`/uploads/${file.filename}`);
        }
      });

      let existingImages = [];
      if (req.body.existingImages) {
        try {
          existingImages = JSON.parse(req.body.existingImages);
        } catch (e) {
          existingImages = Array.isArray(req.body.existingImages) ? req.body.existingImages : [];
        }
      }
      updateData.images = [...existingImages, ...newImages];
    } else if (req.body.images) {
      if (typeof req.body.images === "string") {
        try {
          updateData.images = JSON.parse(req.body.images);
        } catch (e) {
          updateData.images = [req.body.images];
        }
      }
    }

    if (typeof req.body.specifications === "string") {
      try {
        updateData.specifications = JSON.parse(req.body.specifications);
      } catch (e) {}
    }

    if (typeof req.body.colors === "string") {
      try {
        updateData.colors = JSON.parse(req.body.colors);
      } catch (e) {}
    }

    if (req.body.variants !== undefined) {
      let variants = [];
      if (typeof req.body.variants === "string") {
        try {
          variants = JSON.parse(req.body.variants);
        } catch (e) {
          variants = [];
        }
      } else if (Array.isArray(req.body.variants)) {
        variants = req.body.variants;
      }

      if (Array.isArray(variants)) {
        const allImages = updateData.images || [];
        updateData.variants = variants.map((v, index) => {
          let vImages = Array.isArray(v.images) ? [...v.images] : [];
          const uploadedImg =
            variantFilesMap[index] !== undefined
              ? variantFilesMap[index]
              : (v._id && variantFilesMap[v._id]) || (v.id && variantFilesMap[v.id]);

          if (uploadedImg) {
            vImages = [uploadedImg];
          } else if (v.imageIndex !== undefined && allImages[v.imageIndex]) {
            vImages = [allImages[v.imageIndex]];
          } else if (v.imageUrl) {
            vImages = [v.imageUrl];
          } else if (v.image) {
            vImages = [v.image];
          } else if (vImages.length === 0 && allImages.length > 0) {
            vImages = [allImages[0]];
          }
          return {
            ...v,
            price: Number(v.price) || 0,
            discountPrice: Number(v.discountPrice) || 0,
            stock: Number(v.stock) || 0,
            images: vImages,
            isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
          };
        });
      }
    }

    const product = await updateProductService(req.params.id, updateData);
    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const result = await getProductsService(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await getProductByIdService(req.params.id);
    res.status(200).json(product);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await deleteProductService(req.params.id);
    res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const restoreProduct = async (req, res) => {
  try {
    const product = await restoreProductService(req.params.id);
    res.status(200).json({
      message: "Product restored successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  deleteProduct,
  restoreProduct,
};
