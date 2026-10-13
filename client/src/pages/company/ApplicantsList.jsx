import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import ExportButtons from "../../components/ExportButtons";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { openProtectedFile } from "../../utils/protectedFile";
import { resolveFileUrl } from "../../utils/fileUrl";
import SelectDropdown from "../../components/SelectDropdown";

const STATUS_OPTIONS = [
  "in_review",
  "interview_scheduled",
  "approved",
  "declined",
];
const STATUS_LABELS = {
  in_review: "In Review",
  interview_scheduled: "Interview Scheduled",
  approved: "Approved",
  declined: "Declined",
};

const ApplicantsList = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagingId, setMessagingId] = useState(null);

  const loadApplicants = () => {
    setLoading(true);
    api
      .get(`/applications/job/${jobId}`)
      .then(({ data }) => {
        setJob(data.job);
        setApplications(data.applications);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadApplicants, [jobId]);

  const updateStatus = async (appId, status) => {
    await api.put(`/applications/${appId}/status`, { status });
    loadApplicants();
  };

  const handleMessage = async (studentUserId, applicantJobId = jobId) => {
    if (!studentUserId) {
      window.alert("This applicant is not available for messaging.");
      return;
    }

    setMessagingId(studentUserId);
    try {
      const { data } = await api.post("/messages/conversations", {
        otherUserId: studentUserId,
        jobId: applicantJobId || jobId,
      });
      navigate(`/messages/${data.conversation._id}`);
    } catch {
      window.alert("Failed to start conversation.");
    } finally {
      setMessagingId(null);
    }
  };

  if (loading) return <DashboardLoading role="company" />;

  return (
    <DashboardShell
      role="company"
      title={job?.title || "Applicants"}
      subtitle={`${applications.length} applicant${applications.length === 1 ? "" : "s"} · ${job?.department}`}
    >
      <div className="space-y-4">
        {applications.length === 0 && (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-8 text-center text-navy/65 shadow-sm">
            No applicants yet for this posting.
          </div>
        )}
        {applications.map((app) => (
          <div
            key={app._id}
            className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-navy">
                  {app.student?.user?.fullName}
                </p>
                <p className="text-sm text-navy/65">
                  {app.student?.user?.email}
                </p>
                <p className="mt-1 text-sm text-navy/65">
                  {app.student?.course} · {app.student?.yearLevel}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={app.status} />
              </div>
            </div>

            {app.student?.skills?.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {app.student.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-navy/5 px-2 py-1 text-xs text-navy/70"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {app.coverNote && (
              <p className="mb-3 text-sm italic text-navy/70">
                &ldquo;{app.coverNote}&rdquo;
              </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-black/10 pb-3">
              {app.student?.resumeUrl && (
                <button
                  onClick={() =>
                    openProtectedFile(`/students/${app.student._id}/resume`)
                  }
                  className="text-xs font-medium text-[#457D53] hover:underline"
                >
                  View Resume
                </button>
              )}
              {app.student?.transcriptUrl && (
                <a
                  href={resolveFileUrl(app.student.transcriptUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-[#457D53] hover:underline"
                >
                  View Transcript
                </a>
              )}
              {app.student?.user?._id && (
                <button
                  onClick={() =>
                    handleMessage(app.student.user._id, app.job?._id || jobId)
                  }
                  disabled={messagingId === app.student.user._id}
                  className="btn-primary h-9 px-3 py-2 text-[11px] font-bold tracking-[0.02em] shadow-md"
                >
                  {messagingId === app.student.user._id
                    ? "Opening…"
                    : "Message Applicant"}
                </button>
              )}
              {app.student?._id && (
                <ExportButtons
                  basePath={`/students/${app.student._id}/export`}
                  fileBaseName={(
                    app.student.user?.fullName || "student"
                  ).replace(/\s+/g, "_")}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[160px] flex-1">
                <label
                  className="mb-1 block text-xs text-navy/65"
                  htmlFor={`applicant-status-${app._id}`}
                >
                  Application Status
                </label>
                                <SelectDropdown
                  id={`applicant-status-${app._id}`}
                  value={app.status}
                  onChange={(e) => updateStatus(app._id, e.target.value)}
                  options={STATUS_OPTIONS.map((s) => ({
                    value: s,
                    label: STATUS_LABELS[s],
                  }))}
                  className="input-field py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
};

export default ApplicantsList;
