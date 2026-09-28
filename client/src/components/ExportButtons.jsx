import React, { useState } from 'react';
import { downloadExport } from '../utils/download';

// `basePath` is the export route without the format, e.g. "/students/me/export" or
// "/students/64f.../export" — this component just appends "/pdf", "/xlsx", "/csv".
const ExportButtons = ({ basePath, fileBaseName }) => {
  const [downloading, setDownloading] = useState('');

  const handleExport = async (format, extension) => {
    setDownloading(format);
    try {
      await downloadExport(`${basePath}/${format}`, `${fileBaseName}.${extension}`);
    } catch {
      window.alert('Failed to generate that export. Please try again.');
    } finally {
      setDownloading('');
    }
  };

  const buttons = [
    { format: 'pdf', extension: 'pdf', label: 'PDF' },
    { format: 'xlsx', extension: 'xlsx', label: 'Excel' },
    { format: 'csv', extension: 'csv', label: 'CSV' },
  ];

  return (
    <div className="flex gap-2">
      {buttons.map((b) => (
        <button
          key={b.format}
          type="button"
          onClick={() => handleExport(b.format, b.extension)}
          disabled={downloading === b.format}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          {downloading === b.format ? 'Preparing…' : `Export ${b.label}`}
        </button>
      ))}
    </div>
  );
};

export default ExportButtons;
