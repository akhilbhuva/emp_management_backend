import { sendResponse } from "../views/responseHelper.js";
import { AppError } from "../errors/AppError.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return sendResponse(res, err.statusCode, false, err.details, err.message);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return sendResponse(res, 409, false, null, "A record with these details already exists");
  }

  if (err.name === "SequelizeValidationError") {
    const details = err.errors?.map((e) => e.message);
    return sendResponse(res, 422, false, details, "Validation failed");
  }

  console.error(err);
  sendResponse(res, err.status || 500, false, null, err.message || "Internal server error");
};
