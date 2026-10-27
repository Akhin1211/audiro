const Category = require("../models/category.model.js");
const Product = require("../models/product.model.js");

const findCategoryByNameLower = async (nameLower, excludeId = null) => {
  const query = { nameLower };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return await Category.findOne(query);
};

const findCategoryById = async (id) => {
  return await Category.findById(id);
};

const createCategory = async (categoryData) => {
  categoryData.nameLower = categoryData.name.toLowerCase();
  return await Category.create(categoryData);
};

const updateCategory = async (id, updateData) => {
  if (updateData.name) {
    updateData.nameLower = updateData.name.toLowerCase();
  }
  return await Category.findByIdAndUpdate(id, updateData, { new: true });
};

const findCategories = async ({ search = "", status = "All Status", sort = "-createdAt", skip = 0, limit = 10 }) => {
  const query = { isDeleted: false };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (status === "Active") {
    query.isActive = true;
  } else if (status === "Inactive" || status === "Blocked") {
    query.isActive = false;
  }

  const sortOptions = {};
  if (sort === "name_asc") sortOptions.name = 1;
  else if (sort === "name_desc") sortOptions.name = -1;
  else if (sort === "oldest") sortOptions.createdAt = 1;
  else sortOptions.createdAt = -1;

  const categories = await Category.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  // Aggregate total products per category
  const categoriesWithProductCounts = await Promise.all(
    categories.map(async (cat) => {
      const totalProducts = await Product.countDocuments({
        category: cat._id,
        isDeleted: false,
      });
      return {
        ...cat,
        totalProducts,
      };
    })
  );

  return categoriesWithProductCounts;
};

const countCategories = async ({ search = "", status = "All Status" }) => {
  const query = { isDeleted: false };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (status === "Active") {
    query.isActive = true;
  } else if (status === "Inactive" || status === "Blocked") {
    query.isActive = false;
  }

  return await Category.countDocuments(query);
};

const softDeleteCategory = async (id) => {
  return await Category.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { returnDocument: "after"}
  );
};

const restoreCategory = async (id) => {
  return await Category.findByIdAndUpdate(
    id,
    { isDeleted: false, isActive: true },
    { returnDocument: "after"}
  );
};

module.exports = {
  findCategoryByNameLower,
  findCategoryById,
  createCategory,
  updateCategory,
  findCategories,
  countCategories,
  softDeleteCategory,
  restoreCategory,
};
