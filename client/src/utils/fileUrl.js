const RAW_API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api");

export const API_ORIGIN = RAW_API_BASE.replace(/\/api\/?$/, "");

export function resolveFileUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      try {
        const url = new URL(path);
        if (url.host === window.location.host) {
          url.protocol = "https:";
          return url.toString();
        }
      } catch {
        return path;
      }
    }
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
