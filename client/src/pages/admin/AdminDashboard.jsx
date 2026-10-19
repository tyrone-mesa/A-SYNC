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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-2xl border border-[#0b5d3d]/15 bg-[#f5fbf9] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:border-[#0b5d3d]/30 hover:shadow-md hover:bg-[#f0f9f7]"
          >
            <p className="text-xs text-[#0F1E35]/60 sm:text-sm">{c.label}</p>
            <p className="numeric-value mt-1 text-2xl font-bold text-[#0b5d3d] sm:mt-2 sm:text-3xl">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <Link
          to="/admin/students"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Manage Students
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Create student accounts with a @asiatech.edu.ph email and review any
            student's dashboard.
          </p>
        </Link>
        <Link
          to="/admin/coordinators"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Manage Coordinators
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Register coordinators who can view — but not edit — student
            accounts.
          </p>
        </Link>
        <Link
          to="/admin/users"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Manage Users
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Enable or disable student and company accounts.
          </p>
        </Link>
        <Link
          to="/admin/companies"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Verify Companies
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Approve partners and review each company's dashboard.
          </p>
        </Link>
        <Link
          to="/admin/reports"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Reports
          </h3>
          <p className="mt-1 text-xs leading-snug text-navy/65 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Breakdowns by program, application funnel, and monthly trends.
          </p>
        </Link>
        <Link
          to="/admin/registrars"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Manage Registrars
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Register registrars who can view student records and OJT
            certificates.
          </p>
        </Link>
        <Link
          to="/admin/admins"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Manage Admins
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Add or review administrator accounts.
          </p>
        </Link>
        <Link
          to="/admin/archive"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Archive
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Review and restore archived user accounts.
          </p>
        </Link>
        <Link
          to="/admin/security-audit"
          className="admin-quick-card rounded-2xl border border-[#0b5d3d]/10 bg-[#f8fbfa] p-3 shadow-sm last:col-span-2 sm:rounded-[20px] sm:p-5 sm:last:col-span-1 transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/20"
        >
          <h3 className="font-display text-sm font-semibold leading-tight text-[#0b5d3d] sm:text-lg">
            Security Audit
          </h3>
          <p className="mt-1 text-xs leading-snug text-[#0F1E35]/60 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            Review sign-in activity and security events.
          </p>
        </Link>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;