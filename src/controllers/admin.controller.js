const HTTP_STATUS = require("../constants/httpStatus.js");
const {
  adminLoginService,
  getAllUsersService,
  toggleUserBlockService,
  getDashboardStatsService,
} = require("../services/admin.service.js");


// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await adminLoginService(email, password);

    res.status(HTTP_STATUS.OK).json({
      message: "Admin login successful",
      ...result,
    });
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: error.message,
    });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 5 } = req.query;

    const result = await getAllUsersService(
      search,
      Number(page),
      Number(limit)
    );

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: error.message,
    });
  }
};

// Block / Unblock User
const toggleUserBlock = async (req, res) => {
  try {
    const user = await toggleUserBlockService(req.params.userId);

    res.status(HTTP_STATUS.OK).json({
      message: user.isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      user,
    });
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: error.message,
    });
  }
};

// Get Dashboard Analytics Stats & Best-sellers
const getDashboardStats = async (req, res) => {
  try {
    const stats = await getDashboardStatsService();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
      stats,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: error.message,
    });
  }
};

module.exports = {
  adminLogin,
  getAllUsers,
  toggleUserBlock,
  getDashboardStats,
};