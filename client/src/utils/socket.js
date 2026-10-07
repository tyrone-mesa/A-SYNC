import { io } from "socket.io-client";

/*
 * Singleton real-time connection shared by the notification bell and the
 * real-time dashboards. Authenticates with the same JWT used by the REST
 * API. REST polling stays in place everywhere as a fallback — if the socket
 * is unavailable, every page behaves exactly as before.
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

// Returns the shared authenticated socket, creating it if needed.
const getSharedSocket = () => {
  const token = localStorage.getItem("asiatech_token");
  if (!token) return null;

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    // If the session ended (token removed), drop the connection quietly.
    socket.on("connect_error", () => {
      if (!localStorage.getItem("asiatech_token")) {
        disconnectNotificationSocket();
      }
    });
  }

  return socket;
};

export const connectNotificationSocket = (onNotification) => {
  const shared = getSharedSocket();
  if (!shared) return null;

  // Connection may already exist (e.g. the bell remounted) — refresh the handler.
  shared.off("notification:new");
  shared.on("notification:new", onNotification);
  return shared;
};

// Dashboards: subscribe to "dashboard:update". Returns an unsubscribe fn.
export const subscribeToDashboardUpdates = (handler) => {
  const shared = getSharedSocket();
  if (!shared) return () => {};

  shared.on("dashboard:update", handler);
  return () => shared.off("dashboard:update", handler);
};

export const disconnectNotificationSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
