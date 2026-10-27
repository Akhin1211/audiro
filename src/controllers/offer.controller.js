const {
  createOfferService,
  updateOfferService,
  deleteOfferService,
  toggleOfferStatusService,
  listOffersService,
  getOfferByIdService,
  findActiveOffers,
} = require("../services/offer.service.js");

const getAdminOffers = async (req, res) => {
  try {
    const result = await listOffersService(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAdminOffer = async (req, res) => {
  try {
    const offer = await createOfferService(req.body);
    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      offer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAdminOfferById = async (req, res) => {
  try {
    const offer = await getOfferByIdService(req.params.id);
    res.status(200).json({ success: true, offer });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const updateAdminOffer = async (req, res) => {
  try {
    const offer = await updateOfferService(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAdminOffer = async (req, res) => {
  try {
    await deleteOfferService(req.params.id);
    res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleAdminOfferStatus = async (req, res) => {
  try {
    const offer = await toggleOfferStatusService(req.params.id);
    res.status(200).json({
      success: true,
      message: `Offer status updated to ${offer.isActive ? "Active" : "Inactive"}`,
      offer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getActiveOffersUser = async (req, res) => {
  try {
    const offers = await findActiveOffers();
    res.status(200).json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminOffers,
  createAdminOffer,
  getAdminOfferById,
  updateAdminOffer,
  deleteAdminOffer,
  toggleAdminOfferStatus,
  getActiveOffersUser,
};
