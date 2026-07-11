import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Role = sequelize.define(
  "Role",
  {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    // Soft delete flag: Y = deleted, N = not deleted
    role_isdeleted: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "N",
    },
  },
  {
    tableName: "tbl_role",
    timestamps: true,
    createdAt: "role_created_at",
    updatedAt: "role_updated_at",
    defaultScope: {
      where: { role_isdeleted: "N" },
    },
  }
);

export default Role;
