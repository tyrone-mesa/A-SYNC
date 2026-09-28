import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

const ManageJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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
    await api.put(`/jobs/${job._id}`, { status: newStatus });
    loadJobs();
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
      <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
        <div className="divide-y divide-black/10">
          {jobs.length === 0 && (
            <div className="p-8 text-center text-navy/65">No postings yet.</div>
          )}
          {jobs.map((job) => (
            <div
              key={job._id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
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
              <div className="flex items-center gap-3 shrink-0">
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
                  onClick={() => toggleStatus(job)}
                  className="text-xs font-medium text-navy/70 hover:underline"
                >
                  {job.status === "open" ? "Close" : "Reopen"}
                </button>
                <button
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
