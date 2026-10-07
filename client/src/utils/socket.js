import { io } from "socket.io-client";

/*
 * Singleton real-time connection for the notification bell.
 *
 * Polling in NotificationBell stays in place as a fallback — this module only
 * adds instant delivery while the socket is connected. It authenticates with
 * the same JWT used by the REST API (see api/axios.js), and the server puts
 * the connection into a private per-user room (server/utils/socket.js).
 */

let socket = null;

const getSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;

  if (process.env.REACT_APP_API_URL) {
    // Strip a trailing "/api" (with or without slash) to reach the server origin.
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "");
  }

  if (process.env.NODE_ENV === "production") return window.location.origin;

  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export const connectNotificationSocket = (onNotification) => {
  const token = localStorage.getItem("asiatech_token");
  if (!token) return null;

  if (socket) {
    // Connection already exists (e.g. the bell remounted) — refresh the handler.
    socket.off("notification:new");
    socket.on("notification:new", onNotification);
    return socket;
  }

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
  });

  socket.on("notification:new", onNotification);

  // If the session ended (token removed), drop the connection quietly.
  socket.on("connect_error", () => {
    if (!localStorage.getItem("asiatech_token")) {
      disconnectNotificationSocket();
    }
  });

  return socket;
};

export const disconnectNotificationSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
