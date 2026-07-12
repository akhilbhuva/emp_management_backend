import { ProjectAssignment } from "../models/index.js";

// Data access only — no business rules here, those live in services/project.service.js
export const projectAssignmentRepository = {
  async listProjectIdsForUser(user_id) {
    const rows = await ProjectAssignment.findAll({
      where: { assignment_user_id: user_id },
      attributes: ["assignment_project_id"],
    });
    return rows.map((row) => row.assignment_project_id);
  },

  async listActiveUserIds(project_id, { transaction } = {}) {
    const rows = await ProjectAssignment.findAll({
      where: { assignment_project_id: project_id },
      attributes: ["assignment_user_id"],
      transaction,
    });
    return rows.map((row) => row.assignment_user_id);
  },

  async findActiveMembership(project_id, user_id, { transaction } = {}) {
    return ProjectAssignment.findOne({
      where: { assignment_project_id: project_id, assignment_user_id: user_id },
      transaction,
    });
  },

  async create(data, { transaction } = {}) {
    return ProjectAssignment.create(data, { transaction });
  },

  async softDelete(assignmentInstance, { transaction } = {}) {
    return assignmentInstance.update({ assignment_isdeleted: "Y" }, { transaction });
  },
};
