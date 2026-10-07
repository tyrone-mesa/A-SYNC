import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";

const CompanyDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const [profileRes, jobsRes] = await Promise.all([
      api.get("/companies/me"),
      api.get("/jobs/company/mine"),
    ]);
    setProfile(profileRes.data.profile);
    setJobs(jobsRes.data.jobs);
  }, []);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  // Refetch instantly when the server reports a dashboard-relevant mutation.
  useRealtimeDashboard(fetchDashboard);

  if (loading) return <DashboardLoading role="company" />;

  const openJobs = jobs.filter((j) => j.status === "open");
  const totalSlots = jobs.reduce((sum, j) => sum + j.slotsAvailable, 0);
  const filledSlots = jobs.reduce((sum, j) => sum + j.slotsFilled, 0);

  return (
    <DashboardShell
      role="company"
      title="Dashboard"
      subtitle={profile?.companyName || "Company overview"}
      actions={
        <Link to="/company/jobs/new" className="btn-primary text-sm px-4 py-2">
          + Post an Opening
        </Link>
      }
    >
      {!profile?.isVerified && (
        <div className="mb-6 rounded-xl border border-[#0b5d3d]/30 bg-[#0b5d3d]/10 px-4 py-3 text-sm text-[#0b5d3d]">
          Your company account is pending admin verification. Job postings
          remain visible to admins while awaiting approval.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Open Postings", value: openJobs.length },
          { label: "Total Slots", value: totalSlots },
          { label: "Slots Filled", value: filledSlots },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f5fbf9] p-5 shadow-sm"
          >
            <p className="text-sm text-[#0F1E35]/60">{s.label}</p>
            <p className="numeric-value mt-2 text-3xl font-bold text-[#0b5d3d]">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 mb-6 sm:grid-cols-2">
        <div className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              Your Job Postings
            </h2>
            <Link
              to="/company/jobs"
              className="text-sm font-medium text-[#0b5d3d] hover:underline"
            >
              Manage all
            </Link>
          </div>

          <div className="divide-y divide-black/10">
            {jobs.length === 0 && (
              <div className="p-8 text-center text-[#0F1E35]/60">
                You haven&apos;t posted any OJT openings yet.
              </div>
            )}
            {jobs.slice(0, 5).map((job) => (
              <Link
                key={job._id}
                to={`/company/jobs/${job._id}/applicants`}
                className="flex items-center justify-between gap-4 py-4 transition hover:bg-[#0b5d3d]/5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-[#0F1E35]">{job.title}</p>
                  <p className="text-sm text-[#0F1E35]/60">{job.department}</p>
                </div>
                <span className="badge bg-[#e5f2e9] text-[#0b5d3d]">
                  {job.slotsFilled}/{job.slotsAvailable} filled
                </span>
              </Link>
            ))}
          </div>
        </div>

        <Link
          to="/company/attendance"
          className="rounded-[20px] border border-[#0b5d3d]/15 bg-gradient-to-br from-[#0b5d3d]/10 to-[#0b5d3d]/5 p-4 shadow-sm hover:shadow-md hover:border-[#0b5d3d]/25 transition"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              Student Attendance
            </h2>
            <span className="text-2xl">→</span>
          </div>

          <p className="text-sm text-[#0b5d3d]/70 mb-4">
            Manage check-in and check-out for your OJT students
          </p>

          <div className="text-sm font-medium text-[#0b5d3d]">
            Manage Time Tracking
          </div>
        </Link>
      </div>
    </DashboardShell>
  );
};

export default CompanyDashboard;
