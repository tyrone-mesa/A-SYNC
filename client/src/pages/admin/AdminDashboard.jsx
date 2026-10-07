import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data || {});
    } catch {
      setStats({});
    }
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  // Refetch instantly when the server reports a dashboard-relevant mutation.
  useRealtimeDashboard(fetchStats);

  if (loading) return <DashboardLoading role="admin" />;

  const safeStats = stats || {};

  const cards = [
    {
      label: "Students",
      value: safeStats.students ?? 0,
      to: "/admin/students",
    },
    {
      label: "Companies",
      value: safeStats.companies ?? 0,
      to: "/admin/companies",
    },
    {
      label: "Coordinators",
      value: safeStats.coordinators ?? 0,
      to: "/admin/coordinators",
    },
    {
      label: "Open Postings",
      value: safeStats.openJobs ?? 0,
      to: "/admin/reports",
    },
    {
      label: "Applications",
      value: safeStats.applications ?? 0,
      to: "/admin/reports",
    },
  ];

  return (
    <DashboardShell
      role="admin"
      title="Overview"
      subtitle="Platform-wide statistics and moderation tools."
    >
      {(safeStats.pendingCompanies ?? 0) > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-[#0b5d3d]/30 bg-[#0b5d3d]/10 px-4 py-3 text-sm text-[#0b5d3d]">
          <span>
            {safeStats.pendingCompanies} compan
            {safeStats.pendingCompanies === 1 ? "y is" : "ies are"} awaiting
            verification.
          </span>
          <Link
            to="/admin/companies"
            className="font-semibold underline hover:text-[#084c2c]"
          >
            Review Now
          </Link>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-[20px] border border-[#0b5d3d]/15 bg-[#f5fbf9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b5d3d]/30 hover:shadow-md hover:bg-[#f0f9f7]"
          >
            <p className="text-sm text-[#0F1E35]/60">{c.label}</p>
            <p className="numeric-value mt-2 text-3xl font-bold text-[#0b5d3d]">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Link
          to="/admin/students"
          className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
            Manage Students
          </h3>
          <p className="mt-2 text-sm text-[#0F1E35]/60">
            Create student accounts with a @asiatech.edu.ph email and review any
            student's dashboard.
          </p>
        </Link>
        <Link
          to="/admin/coordinators"
          className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
            Manage Coordinators
          </h3>
          <p className="mt-2 text-sm text-[#0F1E35]/60">
            Register coordinators who can view — but not edit — student
            accounts.
          </p>
        </Link>
        <Link
          to="/admin/users"
          className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
            Manage Users
          </h3>
          <p className="mt-2 text-sm text-[#0F1E35]/60">
            Enable or disable student and company accounts.
          </p>
        </Link>
        <Link
          to="/admin/companies"
          className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
            Verify Companies
          </h3>
          <p className="mt-2 text-sm text-[#0F1E35]/60">
            Approve partners and review each company's dashboard.
          </p>
        </Link>
        <Link
          to="/admin/reports"
          className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
            Reports
          </h3>
          <p className="mt-2 text-sm text-navy/65">
            Breakdowns by program, application funnel, and monthly trends.
          </p>
        </Link>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
