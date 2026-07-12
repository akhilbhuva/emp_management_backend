import express from "express";
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  getTasksByEmployee,
  getTasksByManager,
} from "../controllers/task.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { ROLE_IDS } from "../config/roles.js";

const router = express.Router();

router.use(authenticate);

const canManage = authorize(ROLE_IDS.DELIVERY_MANAGER, ROLE_IDS.PROJECT_MANAGER, ROLE_IDS.TEAM_LEAD);

router.get("/getAll", listTasks);
router.get("/getOne/:id", getTask);
router.get("/employee/:employeeId", getTasksByEmployee);
router.get("/manager/:managerId", getTasksByManager);
router.post("/create", canManage, createTask);
router.put("/update/:id", canManage, updateTask);
// Open to all authenticated roles: an employee may update only their own
// task's status, a manager may update status on tasks in projects they
// manage — both enforced in taskService.updateTaskStatus.
router.patch("/update-status/:id", updateTaskStatus);

export default router;
