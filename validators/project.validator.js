import { AppError } from "../errors/AppError.js";

const PROJECT_STATUSES = ["P", "A", "C", "H", "X"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const validateAssignedIds = (assigned_ids, errors) => {
  if (assigned_ids === undefined) return;
  if (!Array.isArray(assigned_ids)) {
    errors.push("assigned_ids must be an array");
  } else if (!assigned_ids.every((id) => Number.isInteger(id) && id > 0)) {
    errors.push("assigned_ids must contain only positive integers");
  }
};

export const validateCreateProject = (body) => {
  const errors = [];
  const { project_name, project_status, project_start_date, project_end_date, project_manager_id, assigned_ids } = body;

  if (!project_name || typeof project_name !== "string" || !project_name.trim()) {
    errors.push("project_name is required");
  }
  if (project_status !== undefined && !PROJECT_STATUSES.includes(project_status)) {
    errors.push("project_status must be one of P, A, C, H, X");
  }
  if (project_start_date !== undefined && !DATE_REGEX.test(project_start_date)) {
    errors.push("project_start_date must be a valid date (YYYY-MM-DD)");
  }
  if (project_end_date !== undefined && !DATE_REGEX.test(project_end_date)) {
    errors.push("project_end_date must be a valid date (YYYY-MM-DD)");
  }
  if (
    DATE_REGEX.test(project_start_date) &&
    DATE_REGEX.test(project_end_date) &&
    project_start_date > project_end_date
  ) {
    errors.push("project_start_date must be before project_end_date");
  }
  if (project_manager_id !== undefined && (!Number.isInteger(project_manager_id) || project_manager_id < 1)) {
    errors.push("project_manager_id must be a positive integer");
  }
  validateAssignedIds(assigned_ids, errors);

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateUpdateProject = (body) => {
  const errors = [];
  const { project_name, project_status, project_start_date, project_end_date, project_manager_id, assigned_ids } = body;

  if (Object.keys(body).length === 0) errors.push("At least one field is required to update");
  if (project_name !== undefined && (typeof project_name !== "string" || !project_name.trim())) {
    errors.push("project_name must be a non-empty string");
  }
  if (project_status !== undefined && !PROJECT_STATUSES.includes(project_status)) {
    errors.push("project_status must be one of P, A, C, H, X");
  }
  if (project_start_date !== undefined && project_start_date !== null && !DATE_REGEX.test(project_start_date)) {
    errors.push("project_start_date must be a valid date (YYYY-MM-DD)");
  }
  if (project_end_date !== undefined && project_end_date !== null && !DATE_REGEX.test(project_end_date)) {
    errors.push("project_end_date must be a valid date (YYYY-MM-DD)");
  }
  if (
    DATE_REGEX.test(project_start_date) &&
    DATE_REGEX.test(project_end_date) &&
    project_start_date > project_end_date
  ) {
    errors.push("project_start_date must be before project_end_date");
  }
  if (
    project_manager_id !== undefined &&
    project_manager_id !== null &&
    (!Number.isInteger(project_manager_id) || project_manager_id < 1)
  ) {
    errors.push("project_manager_id must be a positive integer");
  }
  validateAssignedIds(assigned_ids, errors);

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateListQuery = (query) => {
  const errors = [];
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) errors.push("page must be a positive integer");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push("limit must be between 1 and 100");
  if (query.project_status !== undefined && !PROJECT_STATUSES.includes(query.project_status)) {
    errors.push("project_status filter must be one of P, A, C, H, X");
  }

  if (errors.length) throw new AppError("Validation failed", 422, errors);

  return { page, limit };
};

export const validateIdParam = (id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    throw new AppError("Invalid project id", 400);
  }
  return numId;
};
