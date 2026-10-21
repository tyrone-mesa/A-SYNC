import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  documentErrorMessage,
  downloadDocument,
  ensureFileName,
  fetchDocument,
  getFileKind,
} from "../utils/documentFile";
import { downloadBlob } from "../utils/download";
import { useAuth } from "../context/AuthContext";

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const ICONS = { image: "🖼️", pdf: "📄", video: "🎬", audio: "🎵", text: "📝" };

const DownloadIcon = () => (
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
);

// Phones and tablets can't scroll a PDF placed inside an iframe (iOS shows only the first
// page, Android shows nothing). That includes "Desktop site" mode: iPhones and iPads then
// report themselves as a Mac, so the hardware is checked too (touch points / coarse pointer).
const isTouchFirstDevice = () => {
  if (typeof navigator === "undefined") return false;
  const iosLike =
    /iPhone|iPad|iPod/.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const coarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return iosLike || (coarsePointer && navigator.maxTouchPoints > 0);
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// Google Drive-style in-app viewer for protected documents. Images, PDFs, video, audio
// and text open right here over the page; other files (e.g. Word) show a file card with
// a Download button. Closes via the back arrow, the backdrop, or Esc.
const DocumentViewer = ({ path, name, label, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;
  const [state, setState] = useState("loading"); // loading | ready | error
  const [file, setFile] = useState(null); // { url, blob, mime, kind, text }
  const [errorMessage, setErrorMessage] = useState("");
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setState("loading");
    setFile(null);
    setZoom(1);

    fetchDocument(path, name)
      .then(async ({ blob, mime }) => {
        const kind = getFileKind(mime);
        const text = kind === "text" ? await blob.text() : "";
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(blob);
        setFile({ url: objectUrl, blob, mime, kind, text });
        setState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(documentErrorMessage(error, role));
        setState("error");
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [path, name, role]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const displayName = ensureFileName(name, file?.mime, label || "Document");

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      if (file?.blob) downloadBlob(file.blob, displayName);
      else await downloadDocument(path, name);
    } catch (error) {
      window.alert(documentErrorMessage(error, role));
    } finally {
      setDownloading(false);
    }
  }, [file, displayName, path, name, role]);

  // Mobile browsers (e.g. Android Chrome) can't render a PDF inside an iframe, so give
  // them an "Open" button instead of a blank frame.
  const canEmbedPdf =
    typeof navigator === "undefined" ||
    (navigator.pdfViewerEnabled !== false && !isTouchFirstDevice());

  const zoomBy = (delta) =>
    setZoom((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(current + delta).toFixed(2))),
    );

  const renderBody = () => {
    if (state === "loading") {
      return (
        <div
          className="flex flex-col items-center gap-3 text-white"
          role="status"
        >
          <span
            className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
            aria-hidden="true"
          />
          <p className="text-sm">Loading {label?.toLowerCase() || "file"}…</p>
        </div>
      );
    }

    if (state === "error") {
      return (
        <div
          className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-white px-6 py-8 text-center"
          role="alert"
        >
          <span className="text-4xl" aria-hidden="true">
            ⚠️
          </span>
          <p className="text-sm font-semibold text-[#0F1E35]">
            Can&apos;t open this file
          </p>
          <p className="text-xs text-[#0F1E35]/65">{errorMessage}</p>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary h-10 px-5 text-sm"
          >
            Close
          </button>
        </div>
      );
    }

    if (file.kind === "image") {
      return (
        <div className="h-full w-full overflow-auto">
          <div
            className="flex min-h-full items-center justify-center"
            style={{ width: `${zoom * 100}%`, minWidth: "100%" }}
          >
            <img
              src={file.url}
              alt={displayName}
              className="max-h-full max-w-full select-none object-contain"
              style={
                zoom > 1
                  ? { width: "100%", maxHeight: "none" }
                  : { maxHeight: "100%" }
              }
              draggable={false}
            />
          </div>
        </div>
      );
    }

    if (file.kind === "pdf" && canEmbedPdf) {
      return (
        <iframe
          // The built-in toolbar would show the blob's random id as the title, so it is
          // hidden; the viewer header above already has the file name and Download.
          src={`${file.url}#toolbar=0&navpanes=0&view=FitH`}
          title={displayName}
          className="h-full w-full rounded-xl bg-white"
        />
      );
    }

    if (file.kind === "video") {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={file.url}
          controls
          playsInline
          className="max-h-full max-w-full rounded-xl bg-black"
        />
      );
    }

    if (file.kind === "audio") {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio src={file.url} controls className="w-full max-w-md" />
      );
    }

    if (file.kind === "text") {
      return (
        <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-left text-xs text-[#0F1E35]">
          {file.text}
        </pre>
      );
    }

    const isPdf = file.kind === "pdf";
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-white px-6 py-8 text-center">
        <span className="text-5xl" aria-hidden="true">
          {isPdf ? "📄" : "📎"}
        </span>
        <p className="w-full truncate text-sm font-semibold text-[#0F1E35]">
          {displayName}
        </p>
        <p className="text-xs text-[#0F1E35]/60">
          {isPdf
            ? "This browser can't show PDFs inside the page."
            : "A preview isn't available for this file type."}
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {isPdf && (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary h-11 px-5 text-sm"
            >
              Open in new tab
            </a>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary h-11 gap-2 px-5 text-sm"
          >
            <DownloadIcon />
            Download
          </button>
        </div>
      </div>
    );
  };

  const viewer = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      className="fixed inset-0 z-[2147483647] flex flex-col bg-[#0F1E35]/90 backdrop-blur-sm"
      style={{
        height: "100dvh",
        paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
      }}
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-5xl 2xl:max-w-7xl shrink-0 items-center gap-2 rounded-t-2xl bg-white px-2 py-2 shadow-lg sm:px-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F0E9] text-xl font-bold text-[#17633e] transition hover:bg-[#d7e6da] active:scale-95"
        >
          ←
        </button>
        <span className="hidden text-xl sm:block" aria-hidden="true">
          {ICONS[file?.kind] || "📎"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0F1E35]">
            {displayName}
          </p>
          <p className="truncate text-[11px] text-[#0F1E35]/55">
            {[label, formatSize(file?.blob?.size)].filter(Boolean).join(" · ")}
          </p>
        </div>

        {state === "ready" && file.kind === "image" && (
          <div
            className="flex shrink-0 items-center gap-1"
            role="group"
            aria-label="Zoom"
          >
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomBy(-0.5)}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F0E9] text-lg font-bold text-[#17633e] disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={() => setZoom(1)}
              className="hidden h-9 min-w-[3rem] rounded-full px-2 text-xs font-semibold text-[#0F1E35]/70 sm:block"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomBy(0.5)}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F0E9] text-lg font-bold text-[#17633e] disabled:opacity-40"
            >
              +
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || state === "error"}
          aria-label="Download"
          className="btn-primary h-11 shrink-0 gap-1.5 !px-3 text-sm sm:!px-4"
        >
          <DownloadIcon />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>

      <div
        className="mx-auto flex min-h-0 w-full max-w-5xl 2xl:max-w-7xl flex-1 items-center justify-center overflow-hidden rounded-b-2xl bg-black/50 p-2 sm:p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {renderBody()}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(viewer, document.body)
    : viewer;
};

export default DocumentViewer;
