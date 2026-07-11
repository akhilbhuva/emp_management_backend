import { userService } from "../services/user.service.js";
import { sendResponse } from "../views/responseHelper.js";
import {
  validateCreateUser,
  validateUpdateUser,
  validateListQuery,
  validateIdParam,
} from "../validators/user.validator.js";

export const createUser = async (req, res) => {
  validateCreateUser(req.body);
  const user = await userService.createUser(req.body);
  return sendResponse(res, 201, true, user);
};

export const getUsers = async (req, res) => {
  const { page, limit } = validateListQuery(req.query);
  const { search, role_id, user_status, user_type } = req.query;

  const result = await userService.listUsers({
    requesterRoleId: req.user.role_id,
    page,
    limit,
    search,
    role_id: role_id !== undefined ? Number(role_id) : undefined,
    user_status,
    user_type,
  });

  return sendResponse(res, 200, true, result.data, null, result.meta);
};

export const getUser = async (req, res) => {
  const user_id = validateIdParam(req.params.id);
  const user = await userService.getUserById(req.user.role_id, user_id);
  return sendResponse(res, 200, true, user);
};

export const updateUser = async (req, res) => {
  const user_id = validateIdParam(req.params.id);
  validateUpdateUser(req.body);
  const user = await userService.updateUser(req.user.role_id, user_id, req.body);
  return sendResponse(res, 200, true, user);
};

export const deleteUser = async (req, res) => {
  const user_id = validateIdParam(req.params.id);
  const result = await userService.deleteUser(req.user.role_id, user_id);
  return sendResponse(res, 200, true, result, "User deleted");
};
