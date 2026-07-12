import { sequelize } from "../config/db.js";
import { userRepository } from "../repositories/user.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { AppError } from "../errors/AppError.js";
import { ROLE_ID_TO_USER_TYPE, ROLE_VISIBLE_ROLE_IDS } from "../config/roles.js";
import { cacheGet, cacheSet, cacheDeleteByPrefix } from "../utils/cache.util.js";
import { sessionCache } from "../utils/sessionCache.util.js";
import { buildPaginationMeta } from "../utils/pagination.util.js";

const USERS_LIST_CACHE_PREFIX = "users:list:";
const USERS_LIST_CACHE_TTL_SECONDS = 60;

const buildUsersListCacheKey = ({ requesterRoleId, page, limit, search, role_id, user_status, user_type }) =>
  `${USERS_LIST_CACHE_PREFIX}${requesterRoleId}:${page}:${limit}:${search ?? ""}:${role_id ?? ""}:${user_status ?? ""}:${user_type ?? ""}`;

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

    const user = await sequelize.transaction(async (transaction) => {
      const existing = await userRepository.findByEmail(data.user_email, { transaction });
      if (existing) {
        throw new AppError("A user with this email already exists", 409);
      }

      return userRepository.create(
        {
          role_id: data.role_id,
          user_type,
          user_name: data.user_name,
          user_email: data.user_email,
          user_password: data.user_password,
        },
        { transaction }
      );
    });

    // A new user can appear on any cached listing page/filter combination,
    // so the whole listing cache namespace is invalidated rather than one key.
    await cacheDeleteByPrefix(USERS_LIST_CACHE_PREFIX);

    return toPublicUser(user);
  },

  async listUsers({ requesterRoleId, page, limit, search, role_id, user_status, user_type }) {
    const visibleRoleIds = ROLE_VISIBLE_ROLE_IDS[requesterRoleId] || [];
    if (visibleRoleIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const cacheKey = buildUsersListCacheKey({ requesterRoleId, page, limit, search, role_id, user_status, user_type });
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

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

    const result = {
      data: rows.map(toPublicUser),
      meta: buildPaginationMeta({ page, limit, total: count }),
    };

    await cacheSet(cacheKey, result, USERS_LIST_CACHE_TTL_SECONDS);

    return result;
  },

  async getUserById(requesterRoleId, user_id) {
    const user = await userRepository.findById(user_id);
    if (!user) throw new AppError("User not found", 404);

    assertVisible(requesterRoleId, user.role_id);

    return toPublicUser(user);
  },

  async updateUser(requesterRoleId, user_id, data) {
    const { updated, deactivated } = await sequelize.transaction(async (transaction) => {
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

      return { updated, deactivated: data.user_status === "N" };
    });

    await cacheDeleteByPrefix(USERS_LIST_CACHE_PREFIX);
    if (deactivated) await sessionCache.revokeAllForUser(user_id);

    return toPublicUser(updated);
  },

  async deleteUser(requesterRoleId, user_id) {
    await sequelize.transaction(async (transaction) => {
      const user = await userRepository.findById(user_id, { transaction });
      if (!user) throw new AppError("User not found", 404);

      assertVisible(requesterRoleId, user.role_id);

      await userRepository.softDelete(user, { transaction });
      await sessionRepository.endAllForUser(user_id, { transaction });
    });

    await cacheDeleteByPrefix(USERS_LIST_CACHE_PREFIX);
    await sessionCache.revokeAllForUser(user_id);

    return { user_id };
  },
};
