import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.util.js";
import { logger } from "./logger.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  // Clients authenticate with the same access token used for HTTP requests,
  // passed as `auth: { token }` in the socket.io-client handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) return next(new Error("Authentication required"));

    try {
      socket.data.user = verifyAccessToken(token); // { user_id, role_id, user_type }
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { user_id } = socket.data.user;
    // Personal room — lets emitToUser reach every tab/device a user has open
    // without this module having to track socket ids itself.
    socket.join(`user:${user_id}`);
    logger.debug(`Socket connected: ${socket.id} (user ${user_id})`);

    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id} (user ${user_id})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized! Call initSocket(server) first.");
  }
  return io;
};

// Reaches only sockets currently joined to the user's room — if they have no
// active connection this is a silent no-op, which is exactly "notify if online".
export const emitToUser = (user_id, event, payload) => {
  getIO().to(`user:${user_id}`).emit(event, payload);
};
