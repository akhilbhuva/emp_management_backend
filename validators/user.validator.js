import { AppError } from "../errors/AppError.js";
import { ROLE_ID_TO_USER_TYPE } from "../config/roles.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateCreateUser = (body) => {
  const errors = [];
  const { role_id, user_name, user_email, user_password } = body;

  if (!role_id || !ROLE_ID_TO_USER_TYPE[role_id]) errors.push("role_id must be a valid role");
  if (!user_name || typeof user_name !== "string" || !user_name.trim()) errors.push("user_name is required");
  if (!user_email || !EMAIL_REGEX.test(user_email)) errors.push("user_email must be a valid email");
  if (!user_password || String(user_password).length < 6) errors.push("user_password must be at least 6 characters");

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateUpdateUser = (body) => {
  const errors = [];
  const { role_id, user_name, user_email, user_password, user_status } = body;

  if (Object.keys(body).length === 0) errors.push("At least one field is required to update");
  if (role_id !== undefined && !ROLE_ID_TO_USER_TYPE[role_id]) errors.push("role_id must be a valid role");
  if (user_name !== undefined && (typeof user_name !== "string" || !user_name.trim())) errors.push("user_name must be a non-empty string");
  if (user_email !== undefined && !EMAIL_REGEX.test(user_email)) errors.push("user_email must be a valid email");
  if (user_password !== undefined && String(user_password).length < 6) errors.push("user_password must be at least 6 characters");
  if (user_status !== undefined && !["Y", "N"].includes(user_status)) errors.push("user_status must be Y or N");

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateListQuery = (query) => {
  const errors = [];
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) errors.push("page must be a positive integer");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push("limit must be between 1 and 100");
  if (query.role_id !== undefined && !ROLE_ID_TO_USER_TYPE[Number(query.role_id)]) errors.push("role_id filter is invalid");
  if (query.user_status !== undefined && !["Y", "N"].includes(query.user_status)) errors.push("user_status filter must be Y or N");

  if (errors.length) throw new AppError("Validation failed", 422, errors);

  return { page, limit };
};

export const validateIdParam = (id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    throw new AppError("Invalid user id", 400);
  }
  return numId;
};
