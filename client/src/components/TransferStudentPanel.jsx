import React, { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

// Admin / coordinator tool: move a student's OJT placement to another company when the
// student has a problem with the one that approved them. The new company still has to
// confirm (it sees the request in its applicants list), and the student's current
// placement stays active until it does.
const TransferStudentPanel = ({ studentId }) => {
  const [info, setInfo] = useState(null); // { current, pending }
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const loadInfo = useCallback(() => {
    return api
      .get(`/staff/transfer/students/${studentId}`)
      .then(({ data }) => setInfo(data))
      .catch(() => setInfo({ current: null, pending: null }))
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    setLoading(true);
    loadInfo();
  }, [loadInfo]);

  // Search the destination postings (debounced) while the form is open.
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      api
        .get("/staff/transfer/jobs", { params: { q: query } })
        .then(({ data }) => setJobs(data.jobs || []))
        .catch(() => setJobs([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const current = info?.current;
  const pending = info?.pending;
  const destinations = jobs.filter((job) => job.companyId !== current?.companyId);

  const submit = async () => {
    setMessage(null);
    if (!jobId) return setMessage({ type: "error", text: "Choose a company posting." });
    if (reason.trim().length < 5)
      return setMessage({ type: "error", text: "Enter the reason for the transfer." });
    setBusy(true);
    try {
      const { data } = await api.post(`/staff/transfer/students/${studentId}`, {
        jobId,
        reason: reason.trim(),
      });
      setMessage({ type: "success", text: data.message });
      setOpen(false);
      setJobId("");
      setReason("");
      setQuery("");
      await loadInfo();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Could not send the transfer request.",
      });
    } finally {
      setBusy(false);
    }
  };

  const cancelPending = async () => {
    if (!window.confirm("Cancel this transfer request?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await api.delete(`/staff/transfer/${pending._id}`);
      setMessage({ type: "success", text: data.message });
      await loadInfo();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Could not cancel the request.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <section className="mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-navy">
        OJT placement transfer
      </h2>
      <p className="mt-1 text-xs text-navy/65">
        Use this if the student has a problem with their current company. The new
        company must confirm; hours already rendered carry over.
      </p>

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "success" ? "text-[#5E7867]" : "text-[#DF2E1B]"
          }`}
        >
          {message.text}
        </p>
      )}

      {!current ? (
        <p className="mt-4 text-sm text-navy/65">
          This student has no approved OJT placement, so there is nothing to
          transfer.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-white px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-navy/50">
              Current placement
            </p>
            <p className="font-medium text-navy">{current.companyName}</p>
            <p className="text-sm text-navy/65">{current.jobTitle}</p>
          </div>

          {pending ? (
            <div className="rounded-xl border border-[#f0d7a2] bg-[#fff7ea] px-3 py-3">
              <p className="text-sm font-semibold text-[#8d4f00]">
                Waiting for {pending.companyName} to confirm
              </p>
              <p className="text-sm text-[#8d4f00]/90">{pending.jobTitle}</p>
              {pending.reason && (
                <p className="mt-1 text-xs text-[#8d4f00]/80">
                  Reason: {pending.reason}
                </p>
              )}
              <button
                type="button"
                onClick={cancelPending}
                disabled={busy}
                className="btn-secondary mt-3 px-3 py-2 text-xs"
              >
                Cancel request
              </button>
            </div>
          ) : !open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              Transfer student
            </button>
          ) : (
            <div className="space-y-3 rounded-xl bg-white px-3 py-3">
              <div>
                <label
                  htmlFor="transfer-search"
                  className="mb-1 block text-xs text-navy/65"
                >
                  Search open OJT postings
                </label>
                <input
                  id="transfer-search"
                  className="input-field py-1.5 text-sm"
                  placeholder="Job title…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="transfer-job"
                  className="mb-1 block text-xs text-navy/65"
                >
                  New company / posting
                </label>
                <select
                  id="transfer-job"
                  className="input-field py-1.5 text-sm"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  <option value="">Select a posting…</option>
                  {destinations.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.companyName} — {job.title} ({job.slotsLeft} slot
                      {job.slotsLeft === 1 ? "" : "s"} left)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="transfer-reason"
                  className="mb-1 block text-xs text-navy/65"
                >
                  Reason for the transfer
                </label>
                <textarea
                  id="transfer-reason"
                  rows={3}
                  maxLength={1000}
                  className="input-field w-full resize-none text-sm"
                  placeholder="What problem did the student have at the current company?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {busy ? "Sending…" : "Send transfer request"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TransferStudentPanel;
