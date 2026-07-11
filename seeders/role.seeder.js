import { Role } from "../models/index.js";
import { ROLE_SEED } from "../config/roles.js";

export const seedRoles = async () => {
  for (const role of ROLE_SEED) {
    await Role.findOrCreate({
      where: { role_id: role.role_id },
      defaults: role,
    });
  }
  console.log("✅ Roles seeded (Team Lead, Project Manager, Delivery Manager, Employee)");
};
