const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Real-time notification layer (Socket.IO)
|--------------------------------------------------------------------------
|
| The REST endpoints in routes/notificationRoutes.js stay exactly as they
| are — the bell still polls every 30 seconds as a fallback. This module
| only ADDS a push channel: whenever utils/notify.js writes a Notification
| document, it also emits it here so online users see it instantly.
|
*/

let io = null;

// Each user gets a private room so a notification can never leak to a
// different account.
const userRoom = (userId) => `user:${userId}`;

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
      next();
    } catch (err) {
      next(new Error("Not authorized. Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.userId));
  });

  return io;
};

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

module.exports = { initSocket, emitNotificationToUser };
