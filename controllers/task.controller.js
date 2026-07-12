import { taskService } from "../services/task.service.js";
import { sendResponse } from "../views/responseHelper.js";
import {
  validateCreateTask,
  validateUpdateTask,
  validateUpdateTaskStatus,
  validateListQuery,
  validateIdParam,
} from "../validators/task.validator.js";

const requesterFrom = (req) => ({
  requesterUserId: req.user.user_id,
  requesterRoleId: req.user.role_id,
});

const filtersFrom = (query) => ({
  search: query.search,
  task_status: query.task_status,
  task_priority: query.task_priority,
  task_project_id: query.task_project_id ? Number(query.task_project_id) : undefined,
  due_before: query.due_before,
  due_after: query.due_after,
});

export const createTask = async (req, res) => {
  validateCreateTask(req.body);
  const task = await taskService.createTask(req.body, requesterFrom(req));
  return sendResponse(res, 201, true, task);
};

export const listTasks = async (req, res) => {
  const { page, limit } = validateListQuery(req.query);
  const result = await taskService.listTasks({ ...requesterFrom(req), page, limit, ...filtersFrom(req.query) });
  return sendResponse(res, 200, true, result.data, null, result.meta);
};

export const getTask = async (req, res) => {
  const task_id = validateIdParam(req.params.id);
  const task = await taskService.getTaskById(task_id, requesterFrom(req));
  return sendResponse(res, 200, true, task);
};

export const updateTask = async (req, res) => {
  const task_id = validateIdParam(req.params.id);
  validateUpdateTask(req.body);
  const task = await taskService.updateTask(task_id, req.body, requesterFrom(req));
  return sendResponse(res, 200, true, task);
};

export const updateTaskStatus = async (req, res) => {
  const task_id = validateIdParam(req.params.id);
  validateUpdateTaskStatus(req.body);
  const task = await taskService.updateTaskStatus(task_id, { task_status: req.body.task_status }, requesterFrom(req));
  return sendResponse(res, 200, true, task);
};

export const getTasksByEmployee = async (req, res) => {
  const employee_id = validateIdParam(req.params.employeeId, "employee");
  const { page, limit } = validateListQuery(req.query);
  const result = await taskService.getTasksForEmployee(employee_id, {
    ...requesterFrom(req),
    page,
    limit,
    ...filtersFrom(req.query),
  });
  return sendResponse(res, 200, true, result.data, null, result.meta);
};

export const getTasksByManager = async (req, res) => {
  const manager_id = validateIdParam(req.params.managerId, "manager");
  const { page, limit } = validateListQuery(req.query);
  const result = await taskService.getTasksForManager(manager_id, {
    ...requesterFrom(req),
    page,
    limit,
    ...filtersFrom(req.query),
  });
  return sendResponse(res, 200, true, result.data, null, result.meta);
};
