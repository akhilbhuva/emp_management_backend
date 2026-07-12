import { projectService } from "../services/project.service.js";
import { sendResponse } from "../views/responseHelper.js";
import {
  validateCreateProject,
  validateUpdateProject,
  validateListQuery,
  validateIdParam,
} from "../validators/project.validator.js";

export const createProject = async (req, res) => {
  validateCreateProject(req.body);
  const project = await projectService.createProject(req.body, {
    requesterUserId: req.user.user_id,
    requesterRoleId: req.user.role_id,
  });
  return sendResponse(res, 201, true, project);
};

export const getProjects = async (req, res) => {
  const { page, limit } = validateListQuery(req.query);
  const { search, project_status } = req.query;
  const result = await projectService.listProjects({
    requesterUserId: req.user.user_id,
    requesterRoleId: req.user.role_id,
    page,
    limit,
    search,
    project_status,
  });
  return sendResponse(res, 200, true, result.data, null, result.meta);
};

export const getProject = async (req, res) => {
  const project_id = validateIdParam(req.params.id);
  const project = await projectService.getProjectById(project_id, {
    requesterUserId: req.user.user_id,
    requesterRoleId: req.user.role_id,
  });
  return sendResponse(res, 200, true, project);
};

export const updateProject = async (req, res) => {
  const project_id = validateIdParam(req.params.id);
  validateUpdateProject(req.body);
  const project = await projectService.updateProject(project_id, req.body, {
    requesterUserId: req.user.user_id,
    requesterRoleId: req.user.role_id,
  });
  return sendResponse(res, 200, true, project);
};

export const deleteProject = async (req, res) => {
  const project_id = validateIdParam(req.params.id);
  const result = await projectService.deleteProject(project_id, {
    requesterUserId: req.user.user_id,
    requesterRoleId: req.user.role_id,
  });
  return sendResponse(res, 200, true, result, "Project deleted");
};
