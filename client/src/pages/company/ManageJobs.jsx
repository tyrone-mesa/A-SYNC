import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

const ManageJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState("");
  const [error, setError] = useState("");

  const loadJobs = () => {
    setLoading(true);
    api
      .get("/jobs/company/mine")
      .then(({ data }) => setJobs(data.jobs))
      .finally(() => setLoading(false));
  };

  useEffect(loadJobs, []);

  const toggleStatus = async (job) => {
    const newStatus = job.status === "open" ? "closed" : "open";
    setError("");
    setUpdatingJobId(job._id);
    try {
      const { data } = await api.put(`/jobs/${job._id}`, {
        status: newStatus,
      });
      setJobs((currentJobs) =>
        currentJobs.map((currentJob) =>
          currentJob._id === job._id ? data.job : currentJob,
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update this job posting.",
      );
    } finally {
      setUpdatingJobId("");
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`))
      return;
    await api.delete(`/jobs/${job._id}`);
    loadJobs();
  };

  if (loading) return <DashboardLoading role="company" />;

  return (
    <DashboardShell
      role="company"
      title="Job Postings"
      subtitle="Edit, close, or review applicants for your OJT openings."
      actions={
        <Link to="/company/jobs/new" className="btn-primary px-4 py-2 text-sm">
          + New Posting
        </Link>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]"
        >
          {error}
        </div>
      )}
      <div className="row-shell rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
        <div className="row-list divide-y divide-black/10">
          {jobs.length === 0 && (
            <div className="p-8 text-center text-navy/65">No postings yet.</div>
          )}
          {jobs.map((job) => (
            <div
              key={job._id}
              className="row-item flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <Link
                  to={`/company/jobs/${job._id}/edit`}
                  className="text-xs font-medium text-[#5E7867] hover:underline"
                >
                  Edit
                </Link>
                <p className="font-medium text-navy">{job.title}</p>
                <p className="text-sm text-navy/65">
                  {job.department} · {job.slotsFilled}/{job.slotsAvailable}{" "}
                  filled
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                <span
                  className={`badge ${job.status === "open" ? "bg-gold text-navy" : "bg-navy/10 text-navy/65"}`}
                >
                  {job.status}
                </span>
                <Link
                  to={`/company/jobs/${job._id}/applicants`}
                  className="text-xs font-medium text-[#457D53] hover:underline"
                >
                  Applicants
                </Link>
                <button
                  type="button"
                  onClick={() => toggleStatus(job)}
                  disabled={updatingJobId === job._id}
                  aria-label={`${job.status === "open" ? "Close" : "Open"} ${job.title}`}
                  className="text-xs font-medium text-navy/70 hover:underline disabled:cursor-wait disabled:opacity-50"
                >
                  {updatingJobId === job._id
                    ? "Saving…"
                    : job.status === "open"
                      ? "Close"
                      : "Open"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteJob(job)}
                  className="text-xs font-medium text-[#DF2E1B] hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
};

export default ManageJobs;
