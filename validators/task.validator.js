import { AppError } from "../errors/AppError.js";

// P = pending, I = in progress, C = completed, H = on hold
const TASK_STATUSES = ["P", "I", "C", "H"];
// L = low, M = medium, H = high, U = urgent
const TASK_PRIORITIES = ["L", "M", "H", "U"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

export const validateCreateTask = (body) => {
  const errors = [];
  const {
    task_title,
    task_status,
    task_priority,
    task_due_date,
    task_project_id,
    task_assigned_employee_id,
    task_assigned_manager_id,
  } = body;

  if (!task_title || typeof task_title !== "string" || !task_title.trim()) {
    errors.push("task_title is required");
  }
  if (!isPositiveInt(task_project_id)) {
    errors.push("task_project_id is required and must be a positive integer");
  }
  if (!isPositiveInt(task_assigned_employee_id)) {
    errors.push("task_assigned_employee_id is required and must be a positive integer");
  }
  if (task_assigned_manager_id !== undefined && !isPositiveInt(task_assigned_manager_id)) {
    errors.push("task_assigned_manager_id must be a positive integer");
  }
  if (task_status !== undefined && !TASK_STATUSES.includes(task_status)) {
    errors.push("task_status must be one of P, I, C, H");
  }
  if (task_priority !== undefined && !TASK_PRIORITIES.includes(task_priority)) {
    errors.push("task_priority must be one of L, M, H, U");
  }
  if (task_due_date !== undefined && task_due_date !== null && !DATE_REGEX.test(task_due_date)) {
    errors.push("task_due_date must be a valid date (YYYY-MM-DD)");
  }

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateUpdateTask = (body) => {
  const errors = [];
  const {
    task_title,
    task_status,
    task_priority,
    task_due_date,
    task_assigned_employee_id,
    task_assigned_manager_id,
  } = body;

  if (Object.keys(body).length === 0) errors.push("At least one field is required to update");
  if (task_title !== undefined && (typeof task_title !== "string" || !task_title.trim())) {
    errors.push("task_title must be a non-empty string");
  }
  if (task_assigned_employee_id !== undefined && !isPositiveInt(task_assigned_employee_id)) {
    errors.push("task_assigned_employee_id must be a positive integer");
  }
  if (task_assigned_manager_id !== undefined && !isPositiveInt(task_assigned_manager_id)) {
    errors.push("task_assigned_manager_id must be a positive integer");
  }
  if (task_status !== undefined && !TASK_STATUSES.includes(task_status)) {
    errors.push("task_status must be one of P, I, C, H");
  }
  if (task_priority !== undefined && !TASK_PRIORITIES.includes(task_priority)) {
    errors.push("task_priority must be one of L, M, H, U");
  }
  if (task_due_date !== undefined && task_due_date !== null && !DATE_REGEX.test(task_due_date)) {
    errors.push("task_due_date must be a valid date (YYYY-MM-DD)");
  }

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateUpdateTaskStatus = (body) => {
  const errors = [];
  const { task_status } = body;

  if (!task_status || !TASK_STATUSES.includes(task_status)) {
    errors.push("task_status is required and must be one of P, I, C, H");
  }

  if (errors.length) throw new AppError("Validation failed", 422, errors);
};

export const validateListQuery = (query) => {
  const errors = [];
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) errors.push("page must be a positive integer");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push("limit must be between 1 and 100");
  if (query.task_status !== undefined && !TASK_STATUSES.includes(query.task_status)) {
    errors.push("task_status filter must be one of P, I, C, H");
  }
  if (query.task_priority !== undefined && !TASK_PRIORITIES.includes(query.task_priority)) {
    errors.push("task_priority filter must be one of L, M, H, U");
  }
  if (query.task_project_id !== undefined && !isPositiveInt(Number(query.task_project_id))) {
    errors.push("task_project_id filter must be a positive integer");
  }
  if (query.due_before !== undefined && !DATE_REGEX.test(query.due_before)) {
    errors.push("due_before must be a valid date (YYYY-MM-DD)");
  }
  if (query.due_after !== undefined && !DATE_REGEX.test(query.due_after)) {
    errors.push("due_after must be a valid date (YYYY-MM-DD)");
  }

  if (errors.length) throw new AppError("Validation failed", 422, errors);

  return { page, limit };
};

export const validateIdParam = (id, label = "task") => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    throw new AppError(`Invalid ${label} id`, 400);
  }
  return numId;
};
