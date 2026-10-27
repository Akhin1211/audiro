const {
  createCategoryService,
  updateCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  toggleCategoryStatusService,
  deleteCategoryService,
  restoreCategoryService,
} = require("../services/category.service.js");

const createCategory = async (req, res) => {
  try {
    const category = await createCategoryService(req.body);
    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await updateCategoryService(req.params.id, req.body);
    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await getCategoriesService(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await getCategoryByIdService(req.params.id);
    res.status(200).json(category);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await toggleCategoryStatusService(req.params.id);
    res.status(200).json({
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
      category,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await deleteCategoryService(req.params.id);
    res.status(200).json({
      message: "Category deleted successfully",
      category,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const restoreCategory = async (req, res) => {
  try {
    const category = await restoreCategoryService(req.params.id);
    res.status(200).json({
      message: "Category restored successfully",
      category,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createCategory,
  updateCategory,
  getCategories,
  getCategoryById,
  toggleCategoryStatus,
  deleteCategory,
  restoreCategory,
};
