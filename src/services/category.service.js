const {
  findCategoryByNameLower,
  findCategoryById,
  createCategory,
  updateCategory,
  findCategories,
  countCategories,
  softDeleteCategory,
  restoreCategory,
} = require("../repositories/category.repository.js");

const createCategoryService = async ({ name, isActive = true }) => {
  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  const trimmedName = name.trim();
  const nameLower = trimmedName.toLowerCase();

  const existing = await findCategoryByNameLower(nameLower);
  if (existing && !existing.isDeleted) {
    throw new Error("A category with this name already exists");
  }

  return await createCategory({
    name: trimmedName,
    isActive: Boolean(isActive),
  });
};

const updateCategoryService = async (id, { name, isActive }) => {
  const category = await findCategoryById(id);
  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }

  const updateData = {};

  if (name !== undefined && name.trim()) {
    const trimmedName = name.trim();
    const nameLower = trimmedName.toLowerCase();

    const existing = await findCategoryByNameLower(nameLower, id);
    if (existing && !existing.isDeleted) {
      throw new Error("A category with this name already exists");
    }

    updateData.name = trimmedName;
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  return await updateCategory(id, updateData);
};

const getCategoriesService = async ({
  search = "",
  status = "All Status",
  sort = "-createdAt",
  page = 1,
  limit = 5,
}) => {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const categories = await findCategories({
    search,
    status,
    sort,
    skip,
    limit: limitNum,
  });

  const totalCategories = await countCategories({ search, status });

  return {
    categories,
    currentPage: pageNum,
    totalPages: Math.ceil(totalCategories / limitNum) || 1,
    totalCategories,
  };
};

const getCategoryByIdService = async (id) => {
  const category = await findCategoryById(id);
  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }
  return category;
};

const toggleCategoryStatusService = async (id) => {
  const category = await findCategoryById(id);
  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }

  return await updateCategory(id, { isActive: !category.isActive });
};

const deleteCategoryService = async (id) => {
  const category = await findCategoryById(id);
  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }
  return await softDeleteCategory(id);
};

const restoreCategoryService = async (id) => {
  const category = await findCategoryById(id);
  if (!category) {
    throw new Error("Category not found");
  }
  return await restoreCategory(id);
};

module.exports = {
  createCategoryService,
  updateCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  toggleCategoryStatusService,
  deleteCategoryService,
  restoreCategoryService,
};
