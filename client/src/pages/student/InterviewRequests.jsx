import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardLoading from "../../components/DashboardLoading";
import DashboardShell from "../../components/DashboardShell";

const STATUS_LABELS = {
  proposed: "Awaiting your confirmation",
  confirmed: "Confirmed",
  reschedule_requested: "New time requested",
  completed: "Completed",
  cancelled: "Cancelled",
};

const formatWhen = (value) => (value ? new Date(value).toLocaleString() : "—");

// Batch 2: student-side interview requests (company-proposed schedules).
const InterviewRequests = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    newDateTime: "",
    note: "",
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/interview-schedules/student")
      .then(({ data }) => setSchedules(data.schedules || []))
      .catch(() => setError("Failed to load interview requests."));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const run = async (fn, okMessage) => {
    setBusyId(reschedulingId);
    setNotice("");
    setError("");
    try {
      await fn();
      if (okMessage) setNotice(okMessage);
      setReschedulingId(null);
      setRescheduleForm({ newDateTime: "", note: "" });
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <DashboardLoading role="student" />;

  const active = schedules.filter((s) =>
    ["proposed", "confirmed", "reschedule_requested"].includes(s.status),
  );
  const history = schedules.filter((s) =>
    ["completed", "cancelled"].includes(s.status),
  );

  return (
    <DashboardShell
      role="student"
      title="Interview Requests"
      subtitle="Confirm or reschedule interviews proposed by companies."
    >
      <div className="space-y-6">
        {notice && (
          <div className="rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 text-sm text-[#5E7867]">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-[#DF2E1B]">
            {error}
          </div>
        )}

        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy/60">
            Needs your action
          </h3>
          {active.length === 0 ? (
            <p className="py-2 text-sm text-navy/60">
              No pending interview requests.
            </p>
          ) : (
            <div className="divide-y divide-black/10">
              {active.map((s) => (
                <div key={s._id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-navy">
                        {s.job?.title || "Interview"}
                      </p>
                      <p className="text-sm text-navy/65">
                        {s.company?.companyName || "Company"}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        s.status === "confirmed"
                          ? "text-[#5E7867]"
                          : s.status === "reschedule_requested"
                            ? "text-[#b8860b]"
                            : "text-[#2F6FE4]"
                      }`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-navy/70">
                    {formatWhen(s.proposedDateTime)} ·{" "}
                    {s.mode === "online" ? "Online" : "On-site"}
                    {s.locationOrLink ? ` · ${s.locationOrLink}` : ""}
                  </p>
                  {s.notes && (
                    <p className="mt-1 text-xs italic text-navy/60">
                      {s.notes}
                    </p>
                  )}
                  {s.status === "reschedule_requested" && (
                    <p className="mt-1 text-xs text-[#b8860b]">
                      You requested: {formatWhen(s.rescheduleDateTime)} — the
                      company will propose a new time.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    {s.status === "proposed" && (
                      <button
                        type="button"
                        className="btn-primary h-8 px-3"
                        disabled={busyId === s._id}
                        onClick={() =>
                          run(
                            () =>
                              api.put(`/interview-schedules/${s._id}/confirm`),
                            "Interview confirmed.",
                          )
                        }
                      >
                        Confirm
                      </button>
                    )}
                    {["proposed", "confirmed"].includes(s.status) &&
                      (reschedulingId === s._id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="datetime-local"
                            value={rescheduleForm.newDateTime}
                            onChange={(e) =>
                              setRescheduleForm({
                                ...rescheduleForm,
                                newDateTime: e.target.value,
                              })
                            }
                            className="input-field py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Note (optional)"
                            value={rescheduleForm.note}
                            onChange={(e) =>
                              setRescheduleForm({
                                ...rescheduleForm,
                                note: e.target.value,
                              })
                            }
                            className="input-field py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            className="btn-primary h-8 px-3"
                            disabled={
                              busyId === s._id || !rescheduleForm.newDateTime
                            }
                            onClick={() =>
                              run(
                                () =>
                                  api.put(
                                    `/interview-schedules/${s._id}/reschedule`,
                                    rescheduleForm,
                                  ),
                                "Reschedule request sent.",
                              )
                            }
                          >
                            Send Request
                          </button>
                          <button
                            type="button"
                            className="text-xs text-navy/60 hover:underline"
                            onClick={() => setReschedulingId(null)}
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="font-medium text-[#2F6FE4] hover:underline"
                          onClick={() => setReschedulingId(s._id)}
                        >
                          Request Reschedule
                        </button>
                      ))}
                    {["proposed", "confirmed"].includes(s.status) && (
                      <button
                        type="button"
                        className="font-medium text-[#DF2E1B] hover:underline"
                        disabled={busyId === s._id}
                        onClick={() =>
                          run(
                            () =>
                              api.put(`/interview-schedules/${s._id}/cancel`),
                            "Interview cancelled.",
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy/60">
              History
            </h3>
            <div className="divide-y divide-black/10">
              {history.map((s) => (
                <div
                  key={s._id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {s.job?.title || "Interview"}
                    </p>
                    <p className="text-xs text-navy/65">
                      {s.company?.companyName || "Company"} ·{" "}
                      {formatWhen(s.proposedDateTime)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      s.status === "completed"
                        ? "text-[#5E7867]"
                        : "text-navy/50"
                    }`}
                  >
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default InterviewRequests;
