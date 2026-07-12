import { sequelize } from "../config/db.js";
import { userRepository } from "../repositories/user.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { AppError } from "../errors/AppError.js";
import { ROLE_ID_TO_USER_TYPE, ROLE_VISIBLE_ROLE_IDS } from "../config/roles.js";

const toPublicUser = (user) => ({
  user_id: user.user_id,
  user_name: user.user_name,
  user_email: user.user_email,
  user_type: user.user_type,
  role_id: user.role_id,
  role_name: user.Role?.role_name,
  user_status: user.user_status,
  user_created_at: user.user_created_at,
});

// Users may only see/act on roles strictly below them in the org hierarchy
// (see config/roles.js ROLE_VISIBLE_ROLE_IDS) — enforced here, not in the
// controller, so every entry point (list, get, update, delete) obeys it.
const assertVisible = (requesterRoleId, targetRoleId) => {
  const visibleRoleIds = ROLE_VISIBLE_ROLE_IDS[requesterRoleId] || [];
  if (!visibleRoleIds.includes(targetRoleId)) {
    // 404 rather than 403: don't reveal that a higher/peer-role user exists
    throw new AppError("User not found", 404);
  }
};

export const userService = {
  async createUser(data) {
    const user_type = ROLE_ID_TO_USER_TYPE[data.role_id];

    return sequelize.transaction(async (transaction) => {
      const existing = await userRepository.findByEmail(data.user_email, { transaction });
      if (existing) {
        throw new AppError("A user with this email already exists", 409);
      }

      const user = await userRepository.create(
        {
          role_id: data.role_id,
          user_type,
          user_name: data.user_name,
          user_email: data.user_email,
          user_password: data.user_password,
        },
        { transaction }
      );

      return toPublicUser(user);
    });
  },

  async listUsers({ requesterRoleId, page, limit, search, role_id, user_status, user_type }) {
    const visibleRoleIds = ROLE_VISIBLE_ROLE_IDS[requesterRoleId] || [];
    if (visibleRoleIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    // A role_id filter can only narrow within what the requester is allowed to see
    const roleIdsIn = role_id ? visibleRoleIds.filter((id) => id === role_id) : visibleRoleIds;

    const { rows, count } = await userRepository.findAndCountAll({
      page,
      limit,
      search,
      user_status,
      user_type,
      roleIdsIn,
    });

    return {
      data: rows.map(toPublicUser),
      meta: { page, limit, total: count, totalPages: count === 0 ? 0 : Math.ceil(count / limit) },
    };
  },

  async getUserById(requesterRoleId, user_id) {
    const user = await userRepository.findById(user_id);
    if (!user) throw new AppError("User not found", 404);

    assertVisible(requesterRoleId, user.role_id);

    return toPublicUser(user);
  },

  async updateUser(requesterRoleId, user_id, data) {
    return sequelize.transaction(async (transaction) => {
      const user = await userRepository.findById(user_id, { transaction });
      if (!user) throw new AppError("User not found", 404);

      assertVisible(requesterRoleId, user.role_id);

      if (data.user_email && data.user_email !== user.user_email) {
        const existing = await userRepository.findByEmail(data.user_email, { transaction });
        if (existing) throw new AppError("A user with this email already exists", 409);
      }

      const updateData = { ...data };
      if (data.role_id) {
        assertVisible(requesterRoleId, data.role_id);
        updateData.user_type = ROLE_ID_TO_USER_TYPE[data.role_id];
      }
      const updated = await userRepository.update(user, updateData, { transaction });

      // Deactivating a user must also end their active sessions, atomically
      if (data.user_status === "N") {
        await sessionRepository.endAllForUser(user_id, { transaction });
      }

      return toPublicUser(updated);
    });
  },

  async deleteUser(requesterRoleId, user_id) {
    return sequelize.transaction(async (transaction) => {
      const user = await userRepository.findById(user_id, { transaction });
      if (!user) throw new AppError("User not found", 404);

      assertVisible(requesterRoleId, user.role_id);

      await userRepository.softDelete(user, { transaction });
      await sessionRepository.endAllForUser(user_id, { transaction });

      return { user_id };
    });
  },
};
