import { Op } from "sequelize";
import { Project, User } from "../models/index.js";

const buildWhereClause = ({ search, project_status, managerIds, memberProjectIds }) => {
  const where = {};

  if (project_status) {
    where.project_status = project_status;
  }
  if (search) {
    where.project_name = { [Op.iLike]: `%${search}%` };
  }
  if (managerIds !== undefined) {
    where[Op.or] = [
      { project_manager_id: { [Op.in]: managerIds } },
      { project_id: { [Op.in]: memberProjectIds || [] } },
    ];
  }

  return where;
};

// required: false on both — otherwise Sequelize defaults to an INNER JOIN
// here because User.defaultScope carries a `where`, which would silently
// drop projects that have no manager yet or no members yet.
const projectManagerInclude = {
  model: User,
  as: "Manager",
  attributes: ["user_id", "user_name", "user_email"],
  required: false,
};
const memberInclude = {
  model: User,
  as: "Members",
  attributes: ["user_id", "user_name", "user_email"],
  // ProjectAssignment's defaultScope (assignment_isdeleted: "N") is NOT
  // applied automatically to a belongsToMany join's through table — it has
  // to be filtered explicitly here, or soft-unassigned members still show up.
  through: { attributes: [], where: { assignment_isdeleted: "N" } },
  required: false,
};

// Data access only — no business rules here, those live in services/project.service.js
export const projectRepository = {
  async findAndCountAll({ page, limit, search, project_status, managerIds, memberProjectIds }) {
    const where = buildWhereClause({ search, project_status, managerIds, memberProjectIds });
    const offset = (page - 1) * limit;

    // Members isn't included in list results — a belongsToMany include here
    // would multiply rows and break limit/offset pagination; full member
    // list is only loaded on findById (project detail view).
    return Project.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [["project_id", "DESC"]],
      include: [projectManagerInclude],
    });
  },

  async findById(project_id, { transaction } = {}) {
    return Project.findByPk(project_id, {
      include: [projectManagerInclude, memberInclude],
      transaction,
    });
  },

  async create(data, { transaction } = {}) {
    return Project.create(data, { transaction });
  },

  async update(projectInstance, data, { transaction } = {}) {
    return projectInstance.update(data, { transaction });
  },

  async softDelete(projectInstance, { transaction } = {}) {
    return projectInstance.update({ project_isdeleted: "Y" }, { transaction });
  },
};
