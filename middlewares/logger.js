import { logger } from "../config/logger.js";

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(1)}ms`);
  });

  next();
};
