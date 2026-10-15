import React, { useState } from "react";
import AttachmentViewer from "./AttachmentViewer";
import { resolveAttachmentUrl } from "../utils/fileUrl";


const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

// Attachment bubble inside messages. Tapping opens the in-app viewer
// (same page, with back button + download) instead of a new tab.
const MessageAttachment = ({ attachment }) => {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  if (!attachment?.url) return null;
  const url = resolveAttachmentUrl(attachment.url);
  const isImage =
    (attachment.mimeType || "").startsWith("image/") && !imageFailed;

  if (isImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 block overflow-hidden rounded-xl"
          aria-label={`View ${attachment.name || "image attachment"}`}
        >
          <img
            src={url}
            alt={attachment.name || "Attachment"}
            className="max-h-44 w-auto max-w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        </button>
        {open && (
          <AttachmentViewer
            attachment={attachment}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center gap-2 rounded-xl bg-black/10 px-2.5 py-2 text-left text-xs font-medium underline-offset-2 transition hover:underline"
        aria-label={`View ${attachment.name || "file attachment"}`}
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
      </button>
      {open && (
        <AttachmentViewer
          attachment={attachment}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default MessageAttachment;
