import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

const CompanyDetail = () => {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/companies/${id}`)
      .then(({ data }) => {
        setCompany(data.company);
        setJobs(data.jobs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const toggleVerified = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/companies/${id}/verify`, {
        isVerified: !company.isVerified,
      });
      load();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/users/${company.user._id}/toggle-active`);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (loading || !company) return <DashboardLoading role="admin" />;

  const totalSlots = jobs.reduce((sum, j) => sum + j.slotsAvailable, 0);
  const filledSlots = jobs.reduce((sum, j) => sum + j.slotsFilled, 0);

  return (
    <DashboardShell
      role="admin"
      title={company.companyName}
      subtitle={`${company.user?.email} · ${company.industry || "Industry not set"}`}
      actions={
        <Link to="/admin/companies" className="btn-secondary px-4 py-2 text-sm">
          ← Back
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`badge ${company.isVerified ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20" : "bg-navy/10 text-navy/65"}`}
          >
            {company.isVerified ? "Verified" : "Pending"}
          </span>
          <span
            className={`badge ${company.user?.isActive ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20" : "bg-coral/15 text-[#DF2E1B]"}`}
          >
            {company.user?.isActive ? "Active" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleVerified}
            disabled={busy}
            className={
              company.isVerified
                ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20 rounded-full px-3 py-2 text-xs font-medium shadow-sm"
                : "bg-[#dfeecf] text-[#5E7867] border border-forest/20 rounded-full px-3 py-2 text-xs font-medium shadow-sm hover:brightness-95"
            }
          >
            {company.isVerified ? "Revoke Verification" : "Approve"}
          </button>
          <button
            onClick={toggleActive}
            disabled={busy}
            className="btn-secondary text-xs py-2 px-3"
          >
            {company.user?.isActive ? "Disable Account" : "Enable Account"}
          </button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Job Postings", value: jobs.length },
          { label: "Total Slots", value: totalSlots },
          { label: "Slots Filled", value: filledSlots },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm"
          >
            <p className="text-sm text-navy/65">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-[#457D53]">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {company.description && (
        <div className="mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
          <h2 className="mb-2 font-display text-xl font-semibold text-navy">
            About
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-navy/70">
            {company.description}
          </p>
        </div>
      )}

      <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
        <h2 className="mb-4 font-display text-xl font-semibold text-navy">
          Job Postings
        </h2>
        <div className="divide-y divide-black/10">
          {jobs.length === 0 && (
            <div className="p-8 text-center text-navy/65">
              This company hasn&apos;t posted any OJT openings yet.
            </div>
          )}
          {jobs.map((job) => (
            <div
              key={job._id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-navy">{job.title}</p>
                <p className="text-sm text-navy/65">
                  {job.department} · {job.applicantCount} applicant
                  {job.applicantCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`badge ${job.status === "open" ? "bg-gold text-navy" : "bg-navy/10 text-navy/65"}`}
                >
                  {job.status}
                </span>
                <span className="badge bg-gray text-navy">
                  {job.slotsFilled}/{job.slotsAvailable} filled
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
};

export default CompanyDetail;
