import { emitToUser } from "../config/socket.js";
import { userRepository } from "../repositories/user.repository.js";
import { ROLE_IDS } from "../config/roles.js";

export const notificationService = {
  // Scenario 1: a manager assigns a task to an employee -> notify that
  // employee immediately; a silent no-op if they're not connected.
  notifyTaskAssigned({ employeeId, task }) {
    emitToUser(employeeId, "task:assigned", { task });
  },

  // Scenario 2: an employee updates a task's details/status -> notify every
  // manager above them in the hierarchy: the task's own assigned manager,
  // the project's manager (if a different person), and every Delivery
  // Manager, who oversees every task regardless of project.
  async notifyTaskUpdated({ actorUserId, assignedManagerId, projectManagerId, task }) {
    const managerIds = new Set();
    if (assignedManagerId) managerIds.add(assignedManagerId);
    if (projectManagerId) managerIds.add(projectManagerId);

    const deliveryManagerIds = await userRepository.listIdsByRole(ROLE_IDS.DELIVERY_MANAGER);
    deliveryManagerIds.forEach((id) => managerIds.add(id));

    managerIds.delete(actorUserId); // don't notify the employee about their own change

    managerIds.forEach((managerId) => emitToUser(managerId, "task:updated", { task, updatedBy: actorUserId }));
  },
};
