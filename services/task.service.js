import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import { taskRepository } from "../repositories/task.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { projectAssignmentRepository } from "../repositories/projectAssignment.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../errors/AppError.js";
import { ROLE_IDS, ROLE_VISIBLE_ROLE_IDS } from "../config/roles.js";
import { buildPaginationMeta } from "../utils/pagination.util.js";

const TASK_MANAGER_ROLE_IDS = [ROLE_IDS.TEAM_LEAD, ROLE_IDS.PROJECT_MANAGER, ROLE_IDS.DELIVERY_MANAGER];

const toPublicTask = (task) => ({
  task_id: task.task_id,
  task_title: task.task_title,
  task_description: task.task_description,
  task_status: task.task_status,
  task_priority: task.task_priority,
  task_due_date: task.task_due_date,
  task_project_id: task.task_project_id,
  project_name: task.Project?.project_name,
  task_assigned_employee_id: task.task_assigned_employee_id,
  assigned_employee_name: task.AssignedEmployee?.user_name,
  task_assigned_manager_id: task.task_assigned_manager_id,
  assigned_manager_name: task.AssignedManager?.user_name,
  task_created_by: task.task_created_by,
  task_updated_by: task.task_updated_by,
  task_created_at: task.task_created_at,
});

// Whether a requester may create/edit tasks on a given project — mirrors
// project.service's assertManageAccess/assertTeamLeadIsProjectMember: DM
// always, PM only for projects they manage, TL only for projects they're a member of.
const assertProjectTaskAccess = (project, { requesterRoleId, requesterUserId }) => {
  if (requesterRoleId === ROLE_IDS.DELIVERY_MANAGER) return;
  if (requesterRoleId === ROLE_IDS.PROJECT_MANAGER && project.project_manager_id === requesterUserId) return;
  if (requesterRoleId === ROLE_IDS.TEAM_LEAD) {
    const memberUserIds = (project.Members || []).map((member) => member.user_id);
    if (memberUserIds.includes(requesterUserId)) return;
  }
  // 404 rather than 403: don't reveal that a project outside the requester's reach exists
  throw new AppError("Project not found", 404);
};

const assertValidAssignedEmployee = async (task_project_id, employee_id, { transaction } = {}) => {
  const employee = await userRepository.findById(employee_id, { transaction });
  if (!employee || employee.role_id !== ROLE_IDS.EMPLOYEE) {
    throw new AppError("task_assigned_employee_id must belong to an Employee", 422);
  }
  const membership = await projectAssignmentRepository.findActiveMembership(task_project_id, employee_id, {
    transaction,
  });
  if (!membership) {
    throw new AppError("Assigned employee must be a member of the task's project", 422);
  }
};

const assertValidAssignedManager = async (manager_id, { transaction } = {}) => {
  const manager = await userRepository.findById(manager_id, { transaction });
  if (!manager || !TASK_MANAGER_ROLE_IDS.includes(manager.role_id)) {
    throw new AppError("task_assigned_manager_id must belong to a Team Lead, Project Manager or Delivery Manager", 422);
  }
};

// Whether a requester may view a given task — assigned employee, assigned
// manager, the project's manager, a TL who is a project member, or a DM.
const assertTaskVisible = (task, { requesterUserId, requesterRoleId }) => {
  if (requesterRoleId === ROLE_IDS.DELIVERY_MANAGER) return;
  if (task.task_assigned_employee_id === requesterUserId) return;
  if (task.task_assigned_manager_id === requesterUserId) return;
  if (requesterRoleId === ROLE_IDS.PROJECT_MANAGER && task.Project?.project_manager_id === requesterUserId) return;
  throw new AppError("Task not found", 404);
};

export const taskService = {
  async createTask(data, { requesterUserId, requesterRoleId }) {
    const full = await sequelize.transaction(async (transaction) => {
      const project = await projectRepository.findById(data.task_project_id, { transaction });
      if (!project) throw new AppError("Project not found", 404);
      assertProjectTaskAccess(project, { requesterRoleId, requesterUserId });

      await assertValidAssignedEmployee(data.task_project_id, data.task_assigned_employee_id, { transaction });

      const task_assigned_manager_id = data.task_assigned_manager_id ?? requesterUserId;
      await assertValidAssignedManager(task_assigned_manager_id, { transaction });

      const task = await taskRepository.create(
        {
          task_title: data.task_title,
          task_description: data.task_description ?? null,
          task_status: data.task_status ?? "P",
          task_priority: data.task_priority ?? "M",
          task_due_date: data.task_due_date ?? null,
          task_project_id: data.task_project_id,
          task_assigned_employee_id: data.task_assigned_employee_id,
          task_assigned_manager_id,
          task_created_by: requesterUserId,
          task_updated_by: requesterUserId,
        },
        { transaction }
      );

      return taskRepository.findById(task.task_id, { transaction });
    });

    const publicTask = toPublicTask(full);
    // Fired only after the transaction commits, so we never notify about a
    // task creation that ends up rolled back.
    notificationService.notifyTaskAssigned({ employeeId: full.task_assigned_employee_id, task: publicTask });

    return publicTask;
  },

  async listTasks({ requesterUserId, requesterRoleId, page, limit, search, task_status, task_priority, task_project_id, due_before, due_after }) {
    // Extra where-conditions layered on top of the filter params, built with
    // Sequelize operators directly (kept out of the repository's generic
    // where-builder since the OR logic differs per role).
    let extraWhere;
    if (requesterRoleId === ROLE_IDS.EMPLOYEE) {
      extraWhere = { task_assigned_employee_id: requesterUserId };
    } else if (requesterRoleId === ROLE_IDS.PROJECT_MANAGER) {
      extraWhere = {
        [Op.or]: [{ task_assigned_manager_id: requesterUserId }, { "$Project.project_manager_id$": requesterUserId }],
      };
    } else if (requesterRoleId === ROLE_IDS.TEAM_LEAD) {
      const memberProjectIds = await projectAssignmentRepository.listProjectIdsForUser(requesterUserId);
      extraWhere = {
        [Op.or]: [
          { task_assigned_manager_id: requesterUserId },
          { task_project_id: { [Op.in]: memberProjectIds.length ? memberProjectIds : [-1] } },
        ],
      };
    }
    // DELIVERY_MANAGER: extraWhere stays undefined -> sees everything

    const { rows, count } = await taskRepository.findAndCountAll({
      page,
      limit,
      search,
      task_status,
      task_priority,
      task_project_id,
      due_before,
      due_after,
      extraWhere,
    });

    return {
      data: rows.map(toPublicTask),
      meta: buildPaginationMeta({ page, limit, total: count }),
    };
  },

  async getTaskById(task_id, { requesterUserId, requesterRoleId }) {
    const task = await taskRepository.findById(task_id);
    if (!task) throw new AppError("Task not found", 404);

    assertTaskVisible(task, { requesterUserId, requesterRoleId });

    return toPublicTask(task);
  },

  async updateTask(task_id, data, { requesterUserId, requesterRoleId }) {
    const full = await sequelize.transaction(async (transaction) => {
      const task = await taskRepository.findById(task_id, { transaction });
      if (!task) throw new AppError("Task not found", 404);

      const project = await projectRepository.findById(task.task_project_id, { transaction });
      assertProjectTaskAccess(project, { requesterRoleId, requesterUserId });

      if (data.task_assigned_employee_id !== undefined) {
        await assertValidAssignedEmployee(task.task_project_id, data.task_assigned_employee_id, { transaction });
      }
      if (data.task_assigned_manager_id !== undefined) {
        await assertValidAssignedManager(data.task_assigned_manager_id, { transaction });
      }

      // task_created_by/task_updated_by are stamped from the authenticated
      // requester only, never taken from client input.
      const { task_created_by, task_updated_by, task_project_id, ...fields } = data;
      await taskRepository.update(task, { ...fields, task_updated_by: requesterUserId }, { transaction });

      return taskRepository.findById(task_id, { transaction });
    });

    const publicTask = toPublicTask(full);
    // A manager (re)assigning an employee to this task is Scenario 1, same
    // as on creation — notify the (possibly new) assigned employee.
    if (data.task_assigned_employee_id !== undefined) {
      notificationService.notifyTaskAssigned({ employeeId: full.task_assigned_employee_id, task: publicTask });
    }

    return publicTask;
  },

  async updateTaskStatus(task_id, { task_status }, { requesterUserId, requesterRoleId }) {
    const { full, isOwnTask } = await sequelize.transaction(async (transaction) => {
      const task = await taskRepository.findById(task_id, { transaction });
      if (!task) throw new AppError("Task not found", 404);

      const isOwnTask = task.task_assigned_employee_id === requesterUserId;
      if (!isOwnTask) {
        const project = await projectRepository.findById(task.task_project_id, { transaction });
        assertProjectTaskAccess(project, { requesterRoleId, requesterUserId });
      }

      await taskRepository.update(task, { task_status, task_updated_by: requesterUserId }, { transaction });

      const full = await taskRepository.findById(task_id, { transaction });
      return { full, isOwnTask };
    });

    const publicTask = toPublicTask(full);
    // Scenario 2: the assigned employee (not a manager) changed the task ->
    // notify every manager in the hierarchy above them.
    if (isOwnTask) {
      await notificationService.notifyTaskUpdated({
        actorUserId: requesterUserId,
        assignedManagerId: full.task_assigned_manager_id,
        projectManagerId: full.Project?.project_manager_id,
        task: publicTask,
      });
    }

    return publicTask;
  },

  async getTasksForEmployee(employee_id, { requesterUserId, requesterRoleId, page, limit, task_status, task_priority, task_project_id }) {
    if (requesterRoleId === ROLE_IDS.EMPLOYEE) {
      if (employee_id !== requesterUserId) throw new AppError("Task not found", 404);
    } else {
      const employee = await userRepository.findById(employee_id);
      const visibleRoleIds = ROLE_VISIBLE_ROLE_IDS[requesterRoleId] || [];
      if (!employee || !visibleRoleIds.includes(employee.role_id)) {
        throw new AppError("Employee not found", 404);
      }
    }

    const { rows, count } = await taskRepository.findAndCountAll({
      page,
      limit,
      task_status,
      task_priority,
      task_project_id,
      extraWhere: { task_assigned_employee_id: employee_id },
    });

    return {
      data: rows.map(toPublicTask),
      meta: buildPaginationMeta({ page, limit, total: count }),
    };
  },

  async getTasksForManager(manager_id, { requesterUserId, requesterRoleId, page, limit, task_status, task_priority, task_project_id }) {
    if (requesterRoleId === ROLE_IDS.DELIVERY_MANAGER) {
      const manager = await userRepository.findById(manager_id);
      if (!manager || !TASK_MANAGER_ROLE_IDS.includes(manager.role_id)) {
        throw new AppError("Manager not found", 404);
      }
    } else if (TASK_MANAGER_ROLE_IDS.includes(requesterRoleId)) {
      if (manager_id !== requesterUserId) throw new AppError("Manager not found", 404);
    } else {
      throw new AppError("Manager not found", 404);
    }

    const { rows, count } = await taskRepository.findAndCountAll({
      page,
      limit,
      task_status,
      task_priority,
      task_project_id,
      extraWhere: { task_assigned_manager_id: manager_id },
    });

    return {
      data: rows.map(toPublicTask),
      meta: buildPaginationMeta({ page, limit, total: count }),
    };
  },
};
