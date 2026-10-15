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

// Resolves a message/attachment URL for <img>, <iframe> and <a> use.
// - Full URLs (e.g. Cloudinary) are returned untouched.
// - Local "/uploads/..." paths are pointed at the API origin, so they also work
//   when the client and server are hosted on different origins.
export function resolveAttachmentUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const marker = path.indexOf("/uploads/");
  const normalized = marker !== -1 ? path.slice(marker) : path;
  return resolveFileUrl(normalized);
}
