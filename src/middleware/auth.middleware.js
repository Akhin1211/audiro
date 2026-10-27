const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const HTTP_STATUS = require("../constants/httpStatus.js");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "Authorization token in Bearer format is required",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "Token is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: "Invalid token payload: user identifier missing",
      });
    }

    const user = await User.findById(decoded.userId).select("isBlocked");
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: "User account not found or deactivated",
      });
    }

    if (user.isBlocked) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: "Your account has been blocked",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;