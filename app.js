import "./config/env.js";

import express from "express";
import { logger } from "./middlewares/logger.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// ── Routes ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Employee Management API is running 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// ── Error handler (must be last) ────────────────────────
app.use(errorHandler);

// ── Export app (server.js handles listening) ───────────
export default app;
