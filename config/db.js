import { Sequelize } from "sequelize";
import { logger } from "./logger.js";

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? (sql) => logger.debug(sql) : false,
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info("PostgreSQL connected via Sequelize");
  } catch (error) {
    logger.error("Database connection failed", { error });
    process.exit(1);
  }
};
