import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ProjectAssignment = sequelize.define(
  "ProjectAssignment",
  {
    assignment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    assignment_project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_project",
        key: "project_id",
      },
    },
    assignment_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    // Soft delete flag: Y = deleted (unassigned), N = active assignment
    assignment_isdeleted: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "N",
    },
  },
  {
    tableName: "tbl_project_assignment",
    timestamps: true,
    createdAt: "assignment_created_at",
    updatedAt: "assignment_updated_at",
    defaultScope: {
      where: { assignment_isdeleted: "N" },
    },
  }
);

export default ProjectAssignment;
