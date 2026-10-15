import React, { useEffect } from "react";

const resolveUrl = (path) =>
  !path ? "" : path.startsWith("/") ? path : `/${path}`;

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

// In-app attachment viewer: images render large, PDFs/TXT render in an
// iframe, everything else shows a file card - all with a Download button.
// Opens over the current page (no new tab); closes via X, backdrop, or Esc.
const AttachmentViewer = ({ attachment, onClose }) => {
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

  if (!attachment?.url) return null;
  const url = resolveUrl(attachment.url);
  const mime = attachment.mimeType || "";
  const isImage = mime.startsWith("image/");
  const isPreviewable = isImage || mime === "application/pdf" || mime.startsWith("text/");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={attachment.name || "Attachment preview"}
      className="fixed inset-0 z-[2147483647] flex flex-col bg-[#0F1E35]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-t-2xl bg-white/95 px-3 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0E9] text-lg font-bold text-[#17633e] transition hover:bg-[#d7e6da]"
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
          className="btn-primary h-8 shrink-0 px-3 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          ⬇ Download
        </a>
      </div>

      <div
        className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-black/40 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
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
              className="btn-primary h-9 px-5 text-sm"
            >
              ⬇ Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentViewer;
