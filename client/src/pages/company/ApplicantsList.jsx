import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import ExportButtons from "../../components/ExportButtons";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { openProtectedFile } from "../../utils/protectedFile";
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
  const [schedules, setSchedules] = useState([]);
  const [schedulingId, setSchedulingId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    proposedDateTime: "",
    mode: "online",
    locationOrLink: "",
    notes: "",
  });
  const [rebookingId, setRebookingId] = useState(null);
  const [rebookForm, setRebookForm] = useState({ newDateTime: "", note: "" });
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState("");

  const loadSchedules = () =>
    api
      .get("/interview-schedules/company")
      .then(({ data }) => setSchedules(data.schedules || []))
      .catch(() => {});
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
    try {
      await api.put(`/applications/${appId}/status`, { status });
    } catch (err) {
      window.alert(
        err.response?.data?.message || "Could not update this application.",
      );
    }
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

  useEffect(() => {
    loadSchedules();
  }, []);

  const activeScheduleFor = (appId) =>
    schedules.find(
      (s) =>
        (s.application === appId || s.application?._id === appId) &&
        ["proposed", "confirmed", "reschedule_requested"].includes(s.status),
    );

  const formatWhen = (value) =>
    value ? new Date(value).toLocaleString() : "—";

  const handleScheduleChange = (e) =>
    setScheduleForm({ ...scheduleForm, [e.target.name]: e.target.value });

  const proposeSchedule = async (appId) => {
    setScheduleBusy(true);
    setScheduleNotice("");
    try {
      await api.post("/interview-schedules", {
        applicationId: appId,
        ...scheduleForm,
      });
      setScheduleNotice("Interview proposed. The student has been notified.");
      setSchedulingId(null);
      setScheduleForm({
        proposedDateTime: "",
        mode: "online",
        locationOrLink: "",
        notes: "",
      });
      await loadSchedules();
      window.location.reload();
    } catch (err) {
      setScheduleNotice(
        err.response?.data?.message || "Failed to propose interview.",
      );
    } finally {
      setScheduleBusy(false);
    }
  };

  const completeSchedule = async (scheduleId) => {
    setScheduleBusy(true);
    try {
      await api.put(`/interview-schedules/${scheduleId}/complete`);
      setScheduleNotice("Interview marked as completed.");
      await loadSchedules();
    } catch (err) {
      setScheduleNotice(
        err.response?.data?.message || "Failed to complete interview.",
      );
    } finally {
      setScheduleBusy(false);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    setScheduleBusy(true);
    try {
      await api.put(`/interview-schedules/${scheduleId}/cancel`);
      setScheduleNotice("Interview cancelled.");
      await loadSchedules();
      window.location.reload();
    } catch (err) {
      setScheduleNotice(
        err.response?.data?.message || "Failed to cancel interview.",
      );
    } finally {
      setScheduleBusy(false);
    }
  };

  const rebookSchedule = async (scheduleId) => {
    setScheduleBusy(true);
    try {
      await api.put(`/interview-schedules/${scheduleId}/rebook`, rebookForm);
      setScheduleNotice("New time proposed to the student.");
      setRebookingId(null);
      setRebookForm({ newDateTime: "", note: "" });
      await loadSchedules();
    } catch (err) {
      setScheduleNotice(
        err.response?.data?.message || "Failed to propose a new time.",
      );
    } finally {
      setScheduleBusy(false);
    }
  };

  const SCHEDULE_STATUS_LABELS = {
    proposed: "Awaiting student confirmation",
    confirmed: "Confirmed",
    reschedule_requested: "Student requested a new time",
    completed: "Completed",
    cancelled: "Cancelled",
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
              <div className="min-w-0">
                <p className="font-semibold text-navy">
                  {app.student?.user?.fullName}
                </p>
                <p className="break-all text-sm text-navy/65">
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
                <button
                  onClick={() =>
                    openProtectedFile(`/students/${app.student._id}/transcript`)
                  }
                  className="text-xs font-medium text-[#457D53] hover:underline"
                >
                  View Transcript
                </button>
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

            {app.status === "transfer_pending" && (
              <div className="mb-4 rounded-[14px] border border-[#f0d7a2] bg-[#fff7ea] px-4 py-3">
                <p className="text-sm font-semibold text-[#8d4f00]">
                  Transfer request from the ASIATECH{" "}
                  {app.transfer?.requestedByRole || "office"}
                </p>
                {app.transfer?.reason && (
                  <p className="mt-1 text-sm text-[#8d4f00]/90">
                    Reason: {app.transfer.reason}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#8d4f00]/80">
                  Accepting makes this student your intern and closes their
                  placement at the previous company.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(app._id, "approved")}
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    Accept transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Decline this transfer request?"))
                        updateStatus(app._id, "declined");
                    }}
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`min-w-[160px] flex-1 ${
                  app.status === "transfer_pending" ? "hidden" : ""
                }`}
              >
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

            {(() => {
              const schedule = activeScheduleFor(app._id);
              if (schedule) {
                return (
                  <div className="mt-3 rounded-2xl border border-black/5 bg-[#f8fbfa] p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-navy">
                        Interview:{" "}
                        <span
                          className={
                            schedule.status === "confirmed"
                              ? "text-[#5E7867]"
                              : schedule.status === "reschedule_requested"
                                ? "text-[#b8860b]"
                                : "text-[#2F6FE4]"
                          }
                        >
                          {SCHEDULE_STATUS_LABELS[schedule.status]}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        {schedule.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={() => completeSchedule(schedule._id)}
                            disabled={scheduleBusy}
                            className="font-medium text-[#5E7867] hover:underline"
                          >
                            Mark Completed
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => cancelSchedule(schedule._id)}
                          disabled={scheduleBusy}
                          className="font-medium text-[#DF2E1B] hover:underline"
                        >
                          Cancel Interview
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-navy/70">
                      {formatWhen(schedule.proposedDateTime)} ·{" "}
                      {schedule.mode === "online" ? "Online" : "On-site"}
                      {schedule.locationOrLink
                        ? ` · ${schedule.locationOrLink}`
                        : ""}
                    </p>
                    {schedule.notes && (
                      <p className="mt-1 text-xs italic text-navy/60">
                        {schedule.notes}
                      </p>
                    )}
                    {schedule.status === "reschedule_requested" && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-[#b8860b]">
                          Student prefers:{" "}
                          {formatWhen(schedule.rescheduleDateTime)}
                          {schedule.rescheduleNote
                            ? ` — “${schedule.rescheduleNote}”`
                            : ""}
                        </p>
                        {rebookingId === schedule._id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="datetime-local"
                              value={rebookForm.newDateTime}
                              onChange={(e) =>
                                setRebookForm({
                                  ...rebookForm,
                                  newDateTime: e.target.value,
                                })
                              }
                              className="input-field py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={rebookForm.note}
                              onChange={(e) =>
                                setRebookForm({
                                  ...rebookForm,
                                  note: e.target.value,
                                })
                              }
                              className="input-field py-1.5 text-xs"
                            />
                            <button
                              type="button"
                              className="btn-primary h-8 px-3 text-xs"
                              disabled={
                                scheduleBusy || !rebookForm.newDateTime
                              }
                              onClick={() => rebookSchedule(schedule._id)}
                            >
                              Propose New Time
                            </button>
                            <button
                              type="button"
                              className="text-xs text-navy/60 hover:underline"
                              onClick={() => setRebookingId(null)}
                            >
                              Close
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-medium text-[#2F6FE4] hover:underline"
                            onClick={() => setRebookingId(schedule._id)}
                          >
                            Propose a new time
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              if (app.status !== "in_review") return null;
              return (
                <div className="mt-3">
                  {schedulingId === app._id ? (
                    <div className="rounded-2xl border border-black/5 bg-[#f8fbfa] p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-navy/65">
                            Date & time
                          </label>
                          <input
                            type="datetime-local"
                            name="proposedDateTime"
                            value={scheduleForm.proposedDateTime}
                            onChange={handleScheduleChange}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-navy/65">
                            Mode
                          </label>
                          <SelectDropdown
                            name="mode"
                            value={scheduleForm.mode}
                            onChange={handleScheduleChange}
                            options={[
                              { value: "online", label: "Online" },
                              { value: "onsite", label: "On-site" },
                            ]}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-navy/65">
                            Meeting link / location
                          </label>
                          <input
                            type="text"
                            name="locationOrLink"
                            placeholder={
                              scheduleForm.mode === "online"
                                ? "e.g., https://meet.google.com/..."
                                : "e.g., 3F Main Building, Ortigas"
                            }
                            value={scheduleForm.locationOrLink}
                            onChange={handleScheduleChange}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-navy/65">
                            Notes (optional)
                          </label>
                          <input
                            type="text"
                            name="notes"
                            value={scheduleForm.notes}
                            onChange={handleScheduleChange}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          className="btn-primary h-8 px-3 text-xs"
                          disabled={
                            scheduleBusy || !scheduleForm.proposedDateTime
                          }
                          onClick={() => proposeSchedule(app._id)}
                        >
                          Propose Interview
                        </button>
                        <button
                          type="button"
                          className="text-xs text-navy/60 hover:underline"
                          onClick={() => setSchedulingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium text-[#2F6FE4] hover:underline"
                      onClick={() => setSchedulingId(app._id)}
                    >
                      Schedule Interview
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </DashboardShell>
  );
};

export default ApplicantsList;
