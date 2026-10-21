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
  bmp: "image/bmp",
  avif: "image/avif",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  ogv: "video/ogg",
  json: "application/json",
  xml: "application/xml",
  md: "text/markdown",
  log: "text/plain",
  html: "text/plain",
  rtf: "application/rtf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  zip: "application/zip",
};

const MIME_TO_EXT = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/json": "json",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
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
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml"
  )
    return "text";
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

// `role` is the signed-in viewer's role. A student opening their OWN file gets wording
// addressed to them; staff are told to ask the student to upload it again.
export const documentErrorMessage = (error, role) => {
  const status = error?.response?.status;
  const isStudent = role === "student";
  if (status === 404) {
    return isStudent
      ? "We couldn't find this file. Please upload it again from your Documents card."
      : "This file could not be found. It may have been removed - ask the student to upload it again.";
  }
  if (status === 403) return "You are not allowed to open this file.";
  if (status === 502 || status === 503) {
    return "The file is stored but could not be retrieved right now. Please try again in a moment.";
  }
  return "Unable to open this file right now. Please try again.";
};
