import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Task = sequelize.define(
  "Task",
  {
    task_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    task_title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    task_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // P = pending, I = in progress, C = completed, H = on hold
    task_status: {
      type: DataTypes.ENUM("P", "I", "C", "H"),
      allowNull: false,
      defaultValue: "P",
    },
    // L = low, M = medium, H = high, U = urgent
    task_priority: {
      type: DataTypes.ENUM("L", "M", "H", "U"),
      allowNull: false,
      defaultValue: "M",
    },
    task_due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    task_project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_project",
        key: "project_id",
      },
    },
    task_assigned_employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    task_assigned_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    task_created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    task_updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    // Soft delete flag: Y = deleted, N = not deleted
    task_isdeleted: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "N",
    },
  },
  {
    tableName: "tbl_task",
    timestamps: true,
    createdAt: "task_created_at",
    updatedAt: "task_updated_at",
    defaultScope: {
      where: { task_isdeleted: "N" },
    },
  }
);

export default Task;
