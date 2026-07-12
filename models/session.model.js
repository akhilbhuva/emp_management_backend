import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Session = sequelize.define(
  "Session",
  {
    session_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tbl_users",
        key: "user_id",
      },
    },
    session_token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    session_ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    session_user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    session_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Y = session active (logged in), N = session ended (logged out / rotated)
    session_status: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "Y",
    },
    // Soft delete flag: Y = deleted, N = not deleted
    session_isdeleted: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "N",
    },
  },
  {
    tableName: "tbl_session",
    timestamps: true,
    createdAt: "session_created_at",
    updatedAt: "session_updated_at",
    defaultScope: {
      where: { session_isdeleted: "N" },
    },
    // Covers sessionRepository.endAllForUser's (user_id, session_status)
    // lookup; session_token is already indexed via its unique constraint above.
    indexes: [{ fields: ["user_id", "session_status"] }],
  }
);

export default Session;
