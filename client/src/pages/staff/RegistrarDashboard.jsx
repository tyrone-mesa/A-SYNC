import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";

const cardClass =
  "rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm";

const programOf = (s) => s.course || s.department || "Not specified";

const RegistrarDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/registrar/students");
      setStudents(data.students || []);
    } catch {
      // Keep the existing data if a refresh fails.
    }
  }, []);

  useEffect(() => {
    fetchStudents().finally(() => setLoading(false));
  }, [fetchStudents]);

  useRealtimeDashboard(fetchStudents);

  if (loading) return <DashboardLoading role="registrar" />;

  const placed = students.filter((s) => s.companyPlacement);
  const issued = students.filter(
    (s) => s.assessmentSubmittedAt && s.certificateUrl,
  );

  const byProgram = Object.values(
    students.reduce((acc, s) => {
      const name = programOf(s);
      acc[name] = acc[name] || { name, total: 0, completed: 0 };
      acc[name].total += 1;
      if (s.assessmentSubmittedAt) acc[name].completed += 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const maxTotal = byProgram[0]?.total || 1;

  const recent = students
    .filter((s) => s.assessmentSubmittedAt)
    .sort(
      (a, b) =>
        new Date(b.assessmentSubmittedAt) - new Date(a.assessmentSubmittedAt),
    )
    .slice(0, 5);

  const stats = [
    { label: "Student Records", value: students.length },
    { label: "Placed in a Company", value: placed.length },
    { label: "Not Yet Placed", value: students.length - placed.length },
    { label: "Certificates Issued", value: issued.length },
  ];

  return (
    <DashboardShell
      role="registrar"
      title="Registrar Dashboard"
      subtitle="View student records, OJT placement, and completed certificates."
      actions={
        <Link to="/registrar/students" className="btn-secondary text-sm px-4 py-2">
          Student Records
        </Link>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((c) => (
          <Link
            key={c.label}
            to="/registrar/students"
            className="rounded-[20px] border border-[#0b5d3d]/15 bg-[#f5fbf9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b5d3d]/30 hover:shadow-md"
          >
            <p className="text-sm text-[#0F1E35]/60">{c.label}</p>
            <p className="numeric-value mt-2 text-3xl font-bold text-[#0b5d3d]">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 mb-6 sm:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-4 font-display text-xl font-semibold text-[#0b5d3d]">
            Records by Program
          </h2>
          <div className="space-y-4">
            {byProgram.length === 0 && (
              <div className="p-6 text-center text-sm text-[#0F1E35]/60">
                No student records yet.
              </div>
            )}
            {byProgram.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-[#0F1E35]">
                    {p.name}
                  </span>
                  <span className="numeric-value shrink-0 text-[#0F1E35]/60">
                    {p.completed}/{p.total} completed
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-navy/10">
                  <div
                    className="h-full rounded-full bg-forest transition-all"
                    style={{ width: `${(p.total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} row-shell`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              Recent Completions
            </h2>
            <Link
              to="/registrar/students"
              className="text-sm font-medium text-[#0b5d3d] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="row-list divide-y divide-black/10">
            {recent.length === 0 && (
              <div className="p-6 text-center text-sm text-[#0F1E35]/60">
                No completed assessments yet.
              </div>
            )}
            {recent.map((s) => (
              <Link
                key={s._id}
                to={`/registrar/students/${s._id}`}
                state={{ from: "/registrar/dashboard" }}
                className="row-item flex items-center justify-between gap-4 py-3 transition hover:bg-[#0b5d3d]/5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#0F1E35]">
                    {s.user?.fullName}
                  </p>
                  <p className="truncate text-sm text-[#0F1E35]/60">
                    {s.companyPlacement || "No company recorded"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#0F1E35]/60">
                  {new Date(s.assessmentSubmittedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default RegistrarDashboard;
