import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveAttachmentUrl } from "../utils/fileUrl";
import { downloadBlob } from "../utils/download";


const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

// In-app attachment viewer: images render large, PDFs/TXT render in an
// iframe, everything else shows a file card - all with a Download button.
// Opens over the current page (no new tab); closes via X, backdrop, or Esc.
const AttachmentViewer = ({ attachment, onClose }) => {
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (!attachment) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [attachment, onClose]);

  useEffect(() => {
    setLoadFailed(false);
  }, [attachment?.url]);

  if (!attachment?.url) return null;
  const url = resolveAttachmentUrl(attachment.url);

  // The "download" attribute is ignored for cross-origin URLs (e.g. Cloudinary),
  // so fetch the file and save it as a blob; fall back to opening the URL.
  const handleDownload = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      downloadBlob(await response.blob(), attachment.name || "attachment");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  const mime = attachment.mimeType || "";
  const isImage = mime.startsWith("image/");
  const isPreviewable = isImage || mime === "application/pdf" || mime.startsWith("text/");

  // Rendered through a portal on <body> so no parent (navbar, bottom bar,
  // transformed/blurred containers) can cover the Back / Download buttons.
  const viewer = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={attachment.name || "Attachment preview"}
      className="fixed inset-0 z-[2147483647] flex flex-col bg-[#0F1E35]/90 backdrop-blur-sm"
      style={{
        height: "100dvh",
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
        paddingLeft: "0.75rem",
        paddingRight: "0.75rem",
      }}
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-2 rounded-t-2xl bg-white px-3 py-2.5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F0E9] text-xl font-bold text-[#17633e] transition hover:bg-[#d7e6da] active:scale-95"
        >
          ←
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0F1E35]">
          {attachment.name || "Attachment"}
          {attachment.size > 0 && (
            <span className="ml-2 text-xs font-normal text-[#0F1E35]/55">
              {formatSize(attachment.size)}
            </span>
          )}
        </p>
        <a
          href={url}
          download={attachment.name || true}
          className="btn-primary flex h-11 shrink-0 items-center gap-1.5 px-4 text-sm"
          onClick={handleDownload}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4v11 M7 11l5 5 5-5 M5 20h14" />
          </svg>
          Download
        </a>
      </div>

      <div
        className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-black/50 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && loadFailed && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/95 px-8 py-8 text-center">
            <p className="text-sm font-semibold text-[#0F1E35]">
              This image could not be loaded.
            </p>
            <p className="max-w-xs text-xs text-[#0F1E35]/60">
              The file may have been removed from the server. Ask the sender to
              upload it again.
            </p>
          </div>
        )}
        {isImage && !loadFailed && (
          <img
            onError={() => setLoadFailed(true)}
            src={url}
            alt={attachment.name || "Attachment"}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        )}
        {!isImage && isPreviewable && (
          <iframe
            src={url}
            title={attachment.name || "Attachment preview"}
            className="h-full min-h-[50vh] w-full rounded-xl bg-white"
          />
        )}
        {!isPreviewable && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-8 py-10 text-center">
            <span className="text-4xl" aria-hidden="true">
              📎
            </span>
            <p className="max-w-xs truncate text-sm font-semibold text-[#0F1E35]">
              {attachment.name || "Attachment"}
            </p>
            <p className="text-xs text-[#0F1E35]/55">
              {mime || "File"} · {formatSize(attachment.size)}
            </p>
            <a
              href={url}
              download={attachment.name || true}
              onClick={handleDownload}
              className="btn-primary flex h-9 items-center gap-2 px-5 text-sm"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 4v11 M7 11l5 5 5-5 M5 20h14" />
              </svg>
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(viewer, document.body)
    : viewer;
};

export default AttachmentViewer;
