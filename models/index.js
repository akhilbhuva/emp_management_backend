import Role from "./role.model.js";
import User from "./user.model.js";
import Session from "./session.model.js";
import Project from "./project.model.js";
import ProjectAssignment from "./projectAssignment.model.js";

Role.hasMany(User, { foreignKey: "role_id" });
User.belongsTo(Role, { foreignKey: "role_id" });

User.hasMany(Session, { foreignKey: "user_id" });
Session.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Project, { foreignKey: "project_manager_id", as: "ManagedProjects" });
Project.belongsTo(User, { foreignKey: "project_manager_id", as: "Manager" });

Project.belongsToMany(User, {
  through: ProjectAssignment,
  foreignKey: "assignment_project_id",
  otherKey: "assignment_user_id",
  as: "Members",
});
User.belongsToMany(Project, {
  through: ProjectAssignment,
  foreignKey: "assignment_user_id",
  otherKey: "assignment_project_id",
  as: "Projects",
});

export { Role, User, Session, Project, ProjectAssignment };
