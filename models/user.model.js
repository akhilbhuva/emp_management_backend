import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_role",
        key: "role_id",
      },
    },
    // T = Team Lead, P = Project Manager, D = Delivery Manager, E = Employee
    user_type: {
      type: DataTypes.ENUM("T", "P", "D", "E"),
      allowNull: false,
    },
    user_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    user_email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    user_password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // Y = active, N = inactive
    user_status: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "Y",
    },
    // Soft delete flag: Y = deleted, N = not deleted
    user_isdeleted: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "N",
    },
  },
  {
    tableName: "tbl_users",
    timestamps: true,
    createdAt: "user_created_at",
    updatedAt: "user_updated_at",
    defaultScope: {
      where: { user_isdeleted: "N" },
    },
    // role_id and user_status are the columns every user listing filters on
    // (see repositories/user.repository.js); user_email is already indexed
    // via its unique constraint above.
    indexes: [{ fields: ["role_id"] }, { fields: ["user_status"] }],
    hooks: {
      beforeCreate: async (user) => {
        user.user_password = await bcrypt.hash(user.user_password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed("user_password")) {
          user.user_password = await bcrypt.hash(user.user_password, 10);
        }
      },
    },
  }
);

User.prototype.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.user_password);
};

export default User;
