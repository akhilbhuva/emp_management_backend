import Role from "./role.model.js";
import User from "./user.model.js";
import Session from "./session.model.js";

Role.hasMany(User, { foreignKey: "role_id" });
User.belongsTo(Role, { foreignKey: "role_id" });

User.hasMany(Session, { foreignKey: "user_id" });
Session.belongsTo(User, { foreignKey: "user_id" });

export { Role, User, Session };
