import express from "express";
import { createUser, getUsers, getUser, updateUser, deleteUser } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { ROLE_IDS } from "../config/roles.js";

const router = express.Router();

router.use(authenticate);

router.get("/getAll", getUsers);
router.get("/getOne/:id", getUser);
router.post("/create", authorize(ROLE_IDS.DELIVERY_MANAGER), createUser);
router.put("/update/:id", authorize(ROLE_IDS.DELIVERY_MANAGER), updateUser);
router.delete("/delete/:id", authorize(ROLE_IDS.DELIVERY_MANAGER), deleteUser);

export default router;
