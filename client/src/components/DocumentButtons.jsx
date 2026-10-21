import React, { useCallback, useState } from "react";
import DocumentViewer from "./DocumentViewer";
import { documentErrorMessage, downloadDocument } from "../utils/documentFile";
import { useAuth } from "../context/AuthContext";

const DownloadIcon = () => (
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
);

const EyeIcon = () => (
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
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// View + Download buttons for one protected document. "View" opens the in-app viewer
// (Google Drive style); "Download" saves the file under its original name.
//   path  - API path of the file, e.g. /students/<id>/resume
//   name  - original file name (used for the viewer title and the saved file)
//   label - "Resume", "Transcript / COR", ...
const DocumentButtons = ({
  path,
  name,
  label,
  showDownload = true,
  className = "",
  buttonClassName = "btn-secondary h-9 gap-1.5 px-3 text-xs",
}) => {
  const { user } = useAuth();
  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const closeViewer = useCallback(() => setViewing(false), []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocument(path, name);
    } catch (error) {
      window.alert(documentErrorMessage(error, user?.role));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex shrink-0 flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setViewing(true)}
        className={buttonClassName}
        aria-label={`View ${label || "document"}`}
      >
        <EyeIcon />
        View
      </button>
      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className={buttonClassName}
          aria-label={`Download ${label || "document"}`}
        >
          <DownloadIcon />
          {downloading ? "Downloading…" : "Download"}
        </button>
      )}
      {viewing && (
        <DocumentViewer
          path={path}
          name={name}
          label={label}
          onClose={closeViewer}
        />
      )}
    </div>
  );
};

export default DocumentButtons;
