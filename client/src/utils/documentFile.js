import api from "../api/axios";
import { downloadBlob } from "./download";

const EXT_TO_MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const MIME_TO_EXT = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export const getExtension = (name = "") => {
  const match = String(name).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
};

// The server may answer with a generic type (application/octet-stream) or none at all,
// so fall back to the file extension to decide how a document should be shown.
export const resolveMimeType = (blobType, name) => {
  const type = String(blobType || "").split(";")[0].trim().toLowerCase();
  if (type && type !== "application/octet-stream") return type;
  return EXT_TO_MIME[getExtension(name)] || type || "";
};

export const getFileKind = (mime) => {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";
  return "other";
};

// Makes sure a downloaded file always has an extension, so it opens correctly afterwards.
export const ensureFileName = (name, mime, fallback = "document") => {
  const base = String(name || "").trim() || fallback;
  if (getExtension(base)) return base;
  const ext = MIME_TO_EXT[mime];
  return ext ? `${base}.${ext}` : base;
};

// Documents are protected by the API (login required), so a plain link can't open them.
// Fetch as a blob with the auth header the axios instance already attaches.
export async function fetchDocument(path, name) {
  const response = await api.get(path, { responseType: "blob" });
  const data = response.data;
  const mime = resolveMimeType(
    data?.type || response.headers?.["content-type"],
    name,
  );
  const blob =
    data instanceof Blob && data.type === mime
      ? data
      : new Blob([data], { type: mime });
  return { blob, mime };
}

export async function downloadDocument(path, name) {
  const { blob, mime } = await fetchDocument(path, name);
  downloadBlob(blob, ensureFileName(name, mime));
}

export const documentErrorMessage = (error) => {
  const status = error?.response?.status;
  if (status === 404) {
    return "This file could not be found. It may have been removed - ask the student to upload it again.";
  }
  if (status === 403) return "You are not allowed to open this file.";
  return "Unable to open this file right now. Please try again.";
};
