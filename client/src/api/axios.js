import axios from "axios";

const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined"
    ? process.env.NODE_ENV === "production"
      ? "/api"
      : `${window.location.protocol}//${window.location.hostname}:5000/api`
    : "http://localhost:5000/api");

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Attach the JWT (if present) to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("asiatech_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // The admin-sensitive PIN is no longer stored in localStorage. It is passed
  // per-request from React state via the X-Admin-Sensitive-Pin header, which
  // individual pages set directly on their API calls.

  return config;
});

// Auto-logout on a 401 from protected endpoints. Authentication failures must stay on
// the login form so the page can display the server's invalid-credentials message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthenticationRequest =
      /\/auth\/(login|send-otp|forgot-password|reset-password)/.test(
        requestUrl,
      );

    if (error.response?.status === 401 && !isAuthenticationRequest) {
      localStorage.removeItem("asiatech_token");
      localStorage.removeItem("asiatech_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
