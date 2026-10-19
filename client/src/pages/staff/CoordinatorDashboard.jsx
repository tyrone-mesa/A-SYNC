import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import CoordinatorFolders from "./CoordinatorFolders";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";

const hoursOf = (s) => s.completedOJTHours || 0;
const requiredOf = (s) => s.requiredOJTHours || 0;
const isReady = (s) => hoursOf(s) >= requiredOf(s);
const percentOf = (s) =>
  requiredOf(s) > 0
    ? Math.min(100, Math.round((hoursOf(s) / requiredOf(s)) * 100))
    : 0;

const cardClass =
  "rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm";

const CoordinatorDashboard = () => {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/coordinator/students");
      setStudents(data.students || []);
      setPrograms(data.programs || []);
    } catch {
      // Keep the existing data if a refresh fails.
    }
  }, []);

  useEffect(() => {
    fetchStudents().finally(() => setLoading(false));
  }, [fetchStudents]);

  useRealtimeDashboard(fetchStudents);

  if (loading) return <DashboardLoading role="coordinator" />;

  const completed = students.filter((s) => s.assessmentSubmittedAt);
  const open = students.filter((s) => !s.assessmentSubmittedAt);
  const ready = open.filter(isReady);
  const inProgress = open.filter((s) => !isReady(s));
  const closest = [...inProgress]
    .sort((a, b) => percentOf(b) - percentOf(a))
    .slice(0, 5);

  const stats = [
    { label: "Total Students", value: students.length },
    { label: "OJT In Progress", value: inProgress.length },
    { label: "Ready for Assessment", value: ready.length },
    { label: "Assessment Complete", value: completed.length },
  ];

  return (
    <DashboardShell
      role="coordinator"
      title="Coordinator Dashboard"
      subtitle={
        programs.length > 0
          ? `Students enrolled in: ${programs.join(", ")}.`
          : "Review student progress and submit final performance evaluations."
      }
      actions={
        <Link to="/coordinator/students" className="btn-secondary text-sm px-4 py-2">
          All Students
        </Link>
      }
    >
      {programs.length === 0 && students.length === 0 && (
        <div className="mb-6 rounded-xl border border-[#b8860b]/40 bg-[#fdf6e3] px-4 py-3 text-sm text-[#7a5b12]">
          No course / program has been assigned to your account yet. Ask an
          administrator to assign one so your students appear here.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((c) => (
          <Link
            key={c.label}
            to="/coordinator/students"
            className="rounded-[20px] border border-[#0b5d3d]/15 bg-[#f5fbf9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b5d3d]/30 hover:shadow-md"
          >
            <p className="text-sm text-[#0F1E35]/60">{c.label}</p>
            <p className="numeric-value mt-2 text-3xl font-bold text-[#0b5d3d]">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <CoordinatorFolders students={students} />

      <div className="grid gap-6 mb-6 sm:grid-cols-2">
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              Needs Your Assessment
            </h2>
            <Link
              to="/coordinator/students"
              className="text-sm font-medium text-[#0b5d3d] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-black/10">
            {ready.length === 0 && (
              <div className="p-6 text-center text-sm text-[#0F1E35]/60">
                No students are waiting for assessment.
              </div>
            )}
            {ready.slice(0, 5).map((s) => (
              <Link
                key={s._id}
                to={`/coordinator/students/${s._id}`}
                className="flex items-center justify-between gap-4 py-3 transition hover:bg-[#0b5d3d]/5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#0F1E35]">
                    {s.user?.fullName}
                  </p>
                  <p className="truncate text-sm text-[#0F1E35]/60">
                    {s.course || s.department || "Not specified"}
                  </p>
                </div>
                <span className="badge shrink-0 bg-[#e5f2e9] text-[#0b5d3d]">
                  Assess
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              Closest to Completing
            </h2>
          </div>
          <div className="space-y-4">
            {closest.length === 0 && (
              <div className="p-6 text-center text-sm text-[#0F1E35]/60">
                No students are currently in progress.
              </div>
            )}
            {closest.map((s) => (
              <Link
                key={s._id}
                to={`/coordinator/students/${s._id}`}
                className="block"
              >
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-[#0F1E35]">
                    {s.user?.fullName}
                  </span>
                  <span className="numeric-value shrink-0 text-[#0F1E35]/60">
                    {hoursOf(s)} / {requiredOf(s)} hrs
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-navy/10">
                  <div
                    className="h-full rounded-full bg-forest transition-all"
                    style={{ width: `${percentOf(s)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default CoordinatorDashboard;
