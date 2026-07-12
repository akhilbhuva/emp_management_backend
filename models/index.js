import Role from "./role.model.js";
import User from "./user.model.js";
import Session from "./session.model.js";
import Project from "./project.model.js";
import ProjectAssignment from "./projectAssignment.model.js";
import Task from "./task.model.js";

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

Project.hasMany(Task, { foreignKey: "task_project_id", as: "Tasks" });
Task.belongsTo(Project, { foreignKey: "task_project_id", as: "Project" });

User.hasMany(Task, { foreignKey: "task_assigned_employee_id", as: "AssignedTasks" });
Task.belongsTo(User, { foreignKey: "task_assigned_employee_id", as: "AssignedEmployee" });

User.hasMany(Task, { foreignKey: "task_assigned_manager_id", as: "ManagedTasks" });
Task.belongsTo(User, { foreignKey: "task_assigned_manager_id", as: "AssignedManager" });

export { Role, User, Session, Project, ProjectAssignment, Task };
