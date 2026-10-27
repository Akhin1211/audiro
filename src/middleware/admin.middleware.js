const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model.js");
const HTTP_STATUS = require("../constants/httpStatus.js");

const adminMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "Admin authorization token in Bearer format is required",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "Admin token is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.adminId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: "Forbidden: Admin access privileges required",
      });
    }

    const admin = await Admin.findById(decoded.adminId).select("_id");
    if (!admin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: "Admin account not found or access revoked",
      });
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "Invalid or expired admin token",
    });
  }
};

module.exports = adminMiddleware;