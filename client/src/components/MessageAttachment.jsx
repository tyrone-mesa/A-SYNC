import React from "react";

const resolveUrl = (path) =>
  !path ? "" : path.startsWith("/") ? path : `/${path}`;

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

// Renders a message attachment: images inline (click to open full size),
// everything else as a downloadable file chip. Max upload size is 50MB
// (enforced again on the server).
const MessageAttachment = ({ attachment }) => {
  if (!attachment?.url) return null;
  const url = resolveUrl(attachment.url);
  const isImage = (attachment.mimeType || "").startsWith("image/");

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block overflow-hidden rounded-xl"
      >
        <img
          src={url}
          alt={attachment.name || "Attachment"}
          className="max-h-44 w-auto max-w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={attachment.name || true}
      className="mt-1 flex items-center gap-2 rounded-xl bg-black/10 px-2.5 py-2 text-xs font-medium underline-offset-2 transition hover:underline"
    >
      <span aria-hidden="true">📎</span>
      <span className="min-w-0 flex-1 truncate">
        {attachment.name || "Attachment"}
      </span>
      {attachment.size > 0 && (
        <span className="shrink-0 opacity-70">
          {formatSize(attachment.size)}
        </span>
      )}
    </a>
  );
};

export default MessageAttachment;
