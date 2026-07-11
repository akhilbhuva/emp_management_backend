import "./config/env.js";

import http from "http";
import app from "./app.js";
import { connectDB, sequelize } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import "./models/index.js"; // register models + associations before sync
import { seedRoles } from "./seeders/role.seeder.js";

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
initSocket(server);

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Sync Sequelize models (use { alter: true } in dev for auto-migration)
  await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
  console.log("✅ Database synced");

  await seedRoles();

  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();
