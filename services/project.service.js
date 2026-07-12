import { sequelize } from "../config/db.js";
import { projectRepository } from "../repositories/project.repository.js";
import { projectAssignmentRepository } from "../repositories/projectAssignment.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../errors/AppError.js";
import { ROLE_IDS } from "../config/roles.js";
import { buildPaginationMeta } from "../utils/pagination.util.js";

const toPublicProject = (project) => ({
  project_id: project.project_id,
  project_name: project.project_name,
  project_description: project.project_description,
  project_status: project.project_status,
  project_start_date: project.project_start_date,
  project_end_date: project.project_end_date,
  project_manager_id: project.project_manager_id,
  manager_name: project.Manager?.user_name,
  members: project.Members?.map((member) => ({
    user_id: member.user_id,
    user_name: member.user_name,
    user_email: member.user_email,
  })),
  project_created_by: project.project_created_by,
  project_updated_by: project.project_updated_by,
  project_created_at: project.project_created_at,
});

const PROJECT_MANAGER_ROLE_IDS = [ROLE_IDS.PROJECT_MANAGER, ROLE_IDS.DELIVERY_MANAGER];

// Only a project's manager or a Delivery Manager may create/update/delete it
// (full-field updates) — enforced here so every mutating entry point obeys
// it, mirroring assertVisible in user.service.js. Team Leads get a narrower
// path in updateProject (assigned_ids only, see assertTeamLeadIsProjectMember below).
const assertManageAccess = (project, { requesterRoleId, requesterUserId }) => {
  if (requesterRoleId === ROLE_IDS.DELIVERY_MANAGER) return;
  if (requesterRoleId === ROLE_IDS.PROJECT_MANAGER && project.project_manager_id === requesterUserId) return;
  // 404 rather than 403: don't reveal that a project outside the requester's reach exists
  throw new AppError("Project not found", 404);
};

// A Team Lead may only touch assigned_ids, and only on a project they are
// already a member of — a PM/DM has to put them on the project first.
const assertTeamLeadIsProjectMember = (memberUserIds, requesterUserId) => {
  if (!memberUserIds.includes(requesterUserId)) {
    throw new AppError("Project not found", 404);
  }
};

const assertValidManager = async (project_manager_id, { transaction } = {}) => {
  const manager = await userRepository.findById(project_manager_id, { transaction });
  if (!manager || !PROJECT_MANAGER_ROLE_IDS.includes(manager.role_id)) {
    throw new AppError("project_manager_id must belong to a Project Manager or Delivery Manager", 422);
  }
};

// Makes project membership match assigned_ids exactly — adds missing users,
// removes users no longer in the list. Replaces the old dedicated
// assign/unassign endpoints: the caller always sends the full desired list.
const syncMembers = async (project_id, assigned_ids, { transaction }) => {
  const desiredIds = [...new Set(assigned_ids)];

  for (const user_id of desiredIds) {
    const user = await userRepository.findById(user_id, { transaction });
    if (!user) throw new AppError(`User ${user_id} not found`, 422);
  }

  const currentIds = await projectAssignmentRepository.listActiveUserIds(project_id, { transaction });
  const toAdd = desiredIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !desiredIds.includes(id));

  for (const user_id of toAdd) {
    await projectAssignmentRepository.create(
      { assignment_project_id: project_id, assignment_user_id: user_id },
      { transaction }
    );
  }
  for (const user_id of toRemove) {
    const membership = await projectAssignmentRepository.findActiveMembership(project_id, user_id, { transaction });
    await projectAssignmentRepository.softDelete(membership, { transaction });
  }
};

export const projectService = {
  async createProject(data, { requesterUserId, requesterRoleId }) {
    return sequelize.transaction(async (transaction) => {
      let project_manager_id = data.project_manager_id ?? null;

      if (project_manager_id) {
        await assertValidManager(project_manager_id, { transaction });
      } else if (requesterRoleId === ROLE_IDS.PROJECT_MANAGER) {
        project_manager_id = requesterUserId;
      }

      const project = await projectRepository.create(
        {
          project_name: data.project_name,
          project_description: data.project_description ?? null,
          project_status: data.project_status ?? "P",
          project_start_date: data.project_start_date ?? null,
          project_end_date: data.project_end_date ?? null,
          project_manager_id,
          project_created_by: requesterUserId,
          project_updated_by: requesterUserId,
        },
        { transaction }
      );

      if (data.assigned_ids !== undefined) {
        await syncMembers(project.project_id, data.assigned_ids, { transaction });
      }

      const full = await projectRepository.findById(project.project_id, { transaction });
      return toPublicProject(full);
    });
  },

  async listProjects({ requesterUserId, requesterRoleId, page, limit, search, project_status }) {
    let managerIds;
    let memberProjectIds;

    if (requesterRoleId !== ROLE_IDS.DELIVERY_MANAGER) {
      memberProjectIds = await projectAssignmentRepository.listProjectIdsForUser(requesterUserId);
      managerIds = requesterRoleId === ROLE_IDS.PROJECT_MANAGER ? [requesterUserId] : [];
    }

    const { rows, count } = await projectRepository.findAndCountAll({
      page,
      limit,
      search,
      project_status,
      managerIds,
      memberProjectIds,
    });

    return {
      data: rows.map(toPublicProject),
      meta: buildPaginationMeta({ page, limit, total: count }),
    };
  },

  async getProjectById(project_id, { requesterUserId, requesterRoleId }) {
    const project = await projectRepository.findById(project_id);
    if (!project) throw new AppError("Project not found", 404);

    if (requesterRoleId === ROLE_IDS.DELIVERY_MANAGER) return toPublicProject(project);
    if (project.project_manager_id === requesterUserId) return toPublicProject(project);

    const memberUserIds = (project.Members || []).map((member) => member.user_id);
    if (memberUserIds.includes(requesterUserId)) return toPublicProject(project);

    throw new AppError("Project not found", 404);
  },

  async updateProject(project_id, data, { requesterUserId, requesterRoleId }) {
    return sequelize.transaction(async (transaction) => {
      const project = await projectRepository.findById(project_id, { transaction });
      if (!project) throw new AppError("Project not found", 404);

      if (requesterRoleId === ROLE_IDS.TEAM_LEAD) {
        const otherKeys = Object.keys(data).filter((key) => key !== "assigned_ids");
        if (otherKeys.length > 0) {
          throw new AppError("Team Leads may only update a project's assigned_ids", 403);
        }

        const memberUserIds = (project.Members || []).map((member) => member.user_id);
        assertTeamLeadIsProjectMember(memberUserIds, requesterUserId);

        await projectRepository.update(project, { project_updated_by: requesterUserId }, { transaction });
      } else {
        assertManageAccess(project, { requesterRoleId, requesterUserId });

        if (data.project_manager_id) {
          await assertValidManager(data.project_manager_id, { transaction });
        }

        // project_created_by/project_updated_by are stamped from the
        // authenticated requester only, never taken from client input.
        const { assigned_ids, project_created_by, project_updated_by, ...fields } = data;
        await projectRepository.update(
          project,
          { ...fields, project_updated_by: requesterUserId },
          { transaction }
        );
      }

      if (data.assigned_ids !== undefined) {
        await syncMembers(project_id, data.assigned_ids, { transaction });
      }

      const full = await projectRepository.findById(project_id, { transaction });
      return toPublicProject(full);
    });
  },

  async deleteProject(project_id, { requesterUserId, requesterRoleId }) {
    return sequelize.transaction(async (transaction) => {
      const project = await projectRepository.findById(project_id, { transaction });
      if (!project) throw new AppError("Project not found", 404);

      assertManageAccess(project, { requesterRoleId, requesterUserId });

      await projectRepository.softDelete(project, { transaction });
      return { project_id };
    });
  },
};
