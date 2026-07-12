import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Project = sequelize.define(
  "Project",
  {
    project_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    project_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // P = pending, A = active, C = completed, H = on hold, X = cancelled
    project_status: {
      type: DataTypes.ENUM("P", "A", "C", "H", "X"),
      allowNull: false,
      defaultValue: "P",
    },
    project_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    project_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    project_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    project_created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    project_updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    // Soft delete flag: Y = deleted, N = not deleted
    project_isdeleted: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "N",
    },
  },
  {
    tableName: "tbl_project",
    timestamps: true,
    createdAt: "project_created_at",
    updatedAt: "project_updated_at",
    defaultScope: {
      where: { project_isdeleted: "N" },
    },
    // project_manager_id and project_status are the two columns every
    // project listing/scoping query filters or joins on (see
    // repositories/project.repository.js and services/project.service.js).
    indexes: [{ fields: ["project_manager_id"] }, { fields: ["project_status"] }],
  }
);

export default Project;
