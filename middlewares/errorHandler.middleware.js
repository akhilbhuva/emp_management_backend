import { sendResponse } from "../views/responseHelper.js";
import { AppError } from "../errors/AppError.js";
import { logger } from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    // Client errors (4xx) are expected traffic, not incidents — logged at
    // warn so they're visible without paging anyone; only 5xx AppErrors
    // (rare — e.g. a deliberate 500) escalate to error.
    logger.log(err.statusCode >= 500 ? "error" : "warn", `${req.method} ${req.originalUrl} -> ${err.statusCode} ${err.message}`, {
      details: err.details,
    });
    return sendResponse(res, err.statusCode, false, err.details, err.message);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    logger.warn(`${req.method} ${req.originalUrl} -> 409 unique constraint violated`, { fields: err.fields });
    return sendResponse(res, 409, false, null, "A record with these details already exists");
  }

  if (err.name === "SequelizeValidationError") {
    const details = err.errors?.map((e) => e.message);
    logger.warn(`${req.method} ${req.originalUrl} -> 422 validation failed`, { details });
    return sendResponse(res, 422, false, details, "Validation failed");
  }

  logger.error(`${req.method} ${req.originalUrl} -> ${err.status || 500} unhandled error`, { error: err });
  sendResponse(res, err.status || 500, false, null, err.message || "Internal server error");
};
