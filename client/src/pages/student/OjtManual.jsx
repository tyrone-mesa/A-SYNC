import React, { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import DashboardShell from "../../components/DashboardShell";
import api from "../../api/axios";

const OjtManual = () => {
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");

  const getManual = async (event, action) => {
    event.preventDefault();
    if (loadingAction) return;
    setLoadingAction(action);
    setError("");
    const preview = action === "view" ? window.open("", "_blank") : null;
    try {
      const response = await api.get("/students/me/ojt-manual", {
        params: action === "download" ? { download: "true" } : undefined,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      if (action === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = "asiatech-ojt-manual.pdf";
        link.click();
      } else {
        if (preview) {
          preview.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      preview?.close();
      setError(
        requestError.response?.data?.message ||
          "The OJT manual could not be opened right now.",
      );
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <DashboardShell
      role="student"
      title="OJT Manual"
      subtitle="Review the College of Engineering and Information Technology Education training requirements and forms."
    >
      <section className="rounded-[20px] border border-[#0b5d3d]/15 bg-[#f8fbfa] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dceee3] text-[#0b5d3d]">
            <FileText size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              College OJT Training Manual
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#0F1E35]/65">
              This document includes the OJT guidelines, responsibilities,
              grading system, monitoring schedule, and required forms.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/student/ojt-manual#view"
            onClick={(event) => getManual(event, "view")}
            aria-disabled={Boolean(loadingAction)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            <Eye size={16} aria-hidden="true" />
            {loadingAction === "view" ? "Opening..." : "View Manual"}
          </a>
          <a
            href="/student/ojt-manual#download"
            onClick={(event) => getManual(event, "download")}
            aria-disabled={Boolean(loadingAction)}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            <Download size={16} aria-hidden="true" />
            {loadingAction === "download" ? "Preparing..." : "Download PDF"}
          </a>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </DashboardShell>
  );
};

export default OjtManual;
