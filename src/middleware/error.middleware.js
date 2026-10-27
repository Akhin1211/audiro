const HTTP_STATUS = require("../constants/httpStatus");

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || "An unexpected error occurred";

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const fields = Object.keys(err.keyValue || {}).join(", ");
    message = `${fields || "Field"} already exists. Please choose a different value.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    message = errors.join(". ") || "Validation failed";
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid ${err.path || "identifier"}: ${err.value}`;
  }

  // Handle JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Authentication token has expired";
  }

  // Handle Multer upload errors
  if (err.name === "MulterError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Uploaded file exceeds the maximum allowed size (5MB)";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded";
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Log error on server safely (avoid printing sensitive headers or secrets)
  if (statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`[Client Error ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  const response = {
    message,
  };

  if (process.env.NODE_ENV === "development" && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  errorHandler,
};
