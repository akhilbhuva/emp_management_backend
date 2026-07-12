import { Op } from "sequelize";
import { Task, Project, User } from "../models/index.js";

const buildWhereClause = ({
  search,
  task_status,
  task_priority,
  task_project_id,
  due_before,
  due_after,
  extraWhere,
}) => {
  const where = {};

  if (task_status) where.task_status = task_status;
  if (task_priority) where.task_priority = task_priority;
  if (task_project_id) where.task_project_id = task_project_id;
  if (search) where.task_title = { [Op.iLike]: `%${search}%` };

  if (due_before || due_after) {
    where.task_due_date = {};
    if (due_after) where.task_due_date[Op.gte] = due_after;
    if (due_before) where.task_due_date[Op.lte] = due_before;
  }

  if (extraWhere) Object.assign(where, extraWhere);

  return where;
};

// required: false — otherwise Sequelize inner-joins because User/Project
// carry a defaultScope `where`, which would silently drop tasks whose
// project or assignee got soft-deleted after the task was created.
const projectInclude = {
  model: Project,
  as: "Project",
  attributes: ["project_id", "project_name", "project_manager_id"],
  required: false,
};
const employeeInclude = {
  model: User,
  as: "AssignedEmployee",
  attributes: ["user_id", "user_name", "user_email"],
  required: false,
};
const taskManagerInclude = {
  model: User,
  as: "AssignedManager",
  attributes: ["user_id", "user_name", "user_email"],
  required: false,
};

// Data access only — no business rules here, those live in services/task.service.js
export const taskRepository = {
  async findAndCountAll({
    page,
    limit,
    search,
    task_status,
    task_priority,
    task_project_id,
    due_before,
    due_after,
    extraWhere,
  }) {
    const where = buildWhereClause({
      search,
      task_status,
      task_priority,
      task_project_id,
      due_before,
      due_after,
      extraWhere,
    });
    const offset = (page - 1) * limit;

    return Task.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [["task_id", "DESC"]],
      include: [projectInclude, employeeInclude, taskManagerInclude],
    });
  },

  async findById(task_id, { transaction } = {}) {
    return Task.findByPk(task_id, {
      include: [projectInclude, employeeInclude, taskManagerInclude],
      transaction,
    });
  },

  async create(data, { transaction } = {}) {
    return Task.create(data, { transaction });
  },

  async update(taskInstance, data, { transaction } = {}) {
    return taskInstance.update(data, { transaction });
  },

  async softDelete(taskInstance, { transaction } = {}) {
    return taskInstance.update({ task_isdeleted: "Y" }, { transaction });
  },
};
