const Offer = require("../models/offer.model.js");

const createOffer = async (data) => {
  return await Offer.create(data);
};

const findOfferById = async (id) => {
  return await Offer.findOne({ _id: id, isDeleted: false })
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "name brand price images");
};

const updateOffer = async (id, data) => {
  return await Offer.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true })
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "name brand price images");
};

const deleteOffer = async (id) => {
  return await Offer.findOneAndUpdate(
    { _id: id },
    { isDeleted: true, isActive: false },
    { new: true }
  );
};

const listOffers = async ({ search = "", offerType = "", status = "", page = 1, limit = 10 }) => {
  const query = { isDeleted: false };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (offerType && offerType !== "All") {
    query.targetType = offerType;
  }

  const now = new Date();
  const normalizedStatus = status ? status.toLowerCase() : "";
  if (normalizedStatus === "active") {
    query.isActive = true;
    query.startDate = { $lte: now };
    query.endDate = { $gte: now };
  } else if (normalizedStatus === "scheduled") {
    query.isActive = true;
    query.startDate = { $gt: now };
  } else if (normalizedStatus === "expired") {
    query.endDate = { $lt: now };
  } else if (normalizedStatus === "inactive" || normalizedStatus === "disabled") {
    query.isActive = false;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const offers = await Offer.find(query)
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "name brand")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Offer.countDocuments(query);

  return {
    offers,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

const findActiveOffers = async () => {
  const now = new Date();
  return await Offer.find({
    isDeleted: false,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate("applicableCategories", "name")
    .populate("applicableProducts", "name brand price images");
};

module.exports = {
  createOffer,
  findOfferById,
  updateOffer,
  deleteOffer,
  listOffers,
  findActiveOffers,
};
