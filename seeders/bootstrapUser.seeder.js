// One-off script to create the first Delivery Manager account so someone can log in
// and start creating the rest of the users through the API.
// Run with: node seeders/bootstrapUser.seeder.js
import "../config/env.js";
import { sequelize } from "../config/db.js";
import { seedRoles } from "./role.seeder.js";
import { User } from "../models/index.js";
import { ROLE_IDS, USER_TYPES } from "../config/roles.js";
import { logger } from "../config/logger.js";

const run = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await seedRoles();

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@company.com";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin@123";

  const existing = await User.findOne({ where: { user_email: email } });
  if (existing) {
    logger.info(`User ${email} already exists, skipping.`);
    process.exit(0);
  }

  await User.create({
    role_id: ROLE_IDS.DELIVERY_MANAGER,
    user_type: USER_TYPES.DELIVERY_MANAGER,
    user_name: "Delivery Manager",
    user_email: email,
    user_password: password,
  });

  logger.info(`Bootstrap Delivery Manager created — email: ${email}, password: ${password}`);
  process.exit(0);
};

run().catch((err) => {
  logger.error("Seeding failed", { error: err });
  process.exit(1);
});
