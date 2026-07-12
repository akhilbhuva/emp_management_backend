import express from "express";
import { createProject, getProjects, getProject, updateProject, deleteProject } from "../controllers/project.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { ROLE_IDS } from "../config/roles.js";

const router = express.Router();

router.use(authenticate);

const canManage = authorize(ROLE_IDS.DELIVERY_MANAGER, ROLE_IDS.PROJECT_MANAGER);
// Team Leads may also call update, but the service restricts them to
// editing only assigned_ids on projects managed by the PM/DM they report to.
const canUpdate = authorize(ROLE_IDS.DELIVERY_MANAGER, ROLE_IDS.PROJECT_MANAGER, ROLE_IDS.TEAM_LEAD);

router.get("/getAll", getProjects);
router.get("/getOne/:id", getProject);
router.post("/create", canManage, createProject);
router.put("/update/:id", canUpdate, updateProject);
router.delete("/delete/:id", canManage, deleteProject);

export default router;
