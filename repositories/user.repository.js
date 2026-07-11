import { Op } from "sequelize";
import { User, Role } from "../models/index.js";

const buildWhereClause = ({ search, user_status, user_type, roleIdsIn }) => {
  const where = {};

  if (roleIdsIn) {
    where.role_id = { [Op.in]: roleIdsIn };
  }
  if (user_status) {
    where.user_status = user_status;
  }
  if (user_type) {
    where.user_type = user_type;
  }
  if (search) {
    where[Op.or] = [
      { user_name: { [Op.iLike]: `%${search}%` } },
      { user_email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return where;
};

// Data access only — no business rules here, those live in services/user.service.js
export const userRepository = {
  async findAndCountAll({ page, limit, search, user_status, user_type, roleIdsIn }) {
    const where = buildWhereClause({ search, user_status, user_type, roleIdsIn });
    const offset = (page - 1) * limit;

    return User.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [["user_id", "DESC"]],
      attributes: ["user_id", "user_name", "user_email", "user_type", "role_id", "user_status", "user_created_at"],
      include: [{ model: Role, attributes: ["role_name"] }],
    });
  },

  async findById(user_id, { transaction } = {}) {
    return User.findByPk(user_id, {
      include: [{ model: Role, attributes: ["role_name"] }],
      transaction,
    });
  },

  async findByEmail(user_email, { transaction } = {}) {
    return User.findOne({ where: { user_email }, transaction });
  },

  async create(data, { transaction } = {}) {
    return User.create(data, { transaction });
  },

  async update(userInstance, data, { transaction } = {}) {
    return userInstance.update(data, { transaction });
  },

  async softDelete(userInstance, { transaction } = {}) {
    return userInstance.update({ user_isdeleted: "Y" }, { transaction });
  },
};
