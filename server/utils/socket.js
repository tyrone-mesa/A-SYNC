const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Real-time layer (Socket.IO)
|--------------------------------------------------------------------------
|
| Two channels share one authenticated connection:
|
|   1. Notifications — utils/notify.js emits "notification:new" to a user's
|      private room; the bell's 30-second REST polling stays as a fallback.
|   2. Dashboards — routes call emitDashboardUpdate() after a mutation and
|      every connected client in the target user/role rooms receives
|      "dashboard:update", then simply refetches from the REST API. If the
|      socket is unavailable, every page behaves exactly as before.
|
*/

let io = null;

// Each user gets a private room so an event can never leak to a different
// account; each role gets a shared room for dashboard fan-out.
const userRoom = (userId) => `user:${userId}`;
const roleRoom = (role) => `role:${role}`;

const initSocket = (httpServer, isOriginAllowed) => {
  io = new Server(httpServer, {
    cors: {
      // Same origin policy as the Express CORS middleware in server.js.
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS."));
      },
      credentials: true,
    },
  });

  // Authenticate every connection with the same JWT the REST API uses
  // (mirrors the protect middleware in middleware/auth.js).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Not authorized. No token provided."));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive || user.isArchived) {
        return next(
          new Error("Not authorized. Account not found or disabled.")
        );
      }

      socket.userId = String(user._id);
      socket.userRole = user.role;
      next();
    } catch (err) {
      next(new Error("Not authorized. Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.userId));
    if (socket.userRole) {
      socket.join(roleRoom(socket.userRole));
    }
  });

  return io;
};

const getIO = () => io;

// Called by utils/notify.js after a Notification document is saved.
// Fails silently — a broken socket layer must never affect the action that
// triggered the notification.
const emitNotificationToUser = (userId, notification) => {
  try {
    if (!io || !userId) return;
    io.to(userRoom(userId)).emit("notification:new", { notification });
  } catch (err) {
    console.error("Failed to emit real-time notification:", err.message);
  }
};

// Emit a "dashboard:update" event to specific users AND/OR roles.
// `scope` tells clients which part of the dashboard changed; clients respond
// by refetching from the REST API, so socket payloads are never trusted as
// state and a socket failure can never corrupt a dashboard.
const emitDashboardUpdate = ({ users = [], roles = [], scope } = {}) => {
  try {
    if (!io) return;

    const rooms = [
      ...users.filter(Boolean).map((userId) => userRoom(userId)),
      ...roles.filter(Boolean).map((role) => roleRoom(role)),
    ];

    rooms.forEach((room) => io.to(room).emit("dashboard:update", { scope }));
  } catch (err) {
    console.error("Failed to emit dashboard update:", err.message);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitNotificationToUser,
  emitDashboardUpdate,
};
