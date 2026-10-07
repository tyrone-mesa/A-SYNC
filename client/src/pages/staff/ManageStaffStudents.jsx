import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { BACHELOR_PROGRAMS, ASSOCIATE_PROGRAMS } from "../../constants/courses";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";

const PROGRAMS = [...BACHELOR_PROGRAMS, ...ASSOCIATE_PROGRAMS];

const ManageStaffStudents = () => {
  const { user } = useAuth();
  const isCoordinator = user?.role === "coordinator";
  const base = isCoordinator ? "/coordinator" : "/registrar";
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await api.get(`/staff${base}/students`);
      setStudents(data.students || []);
    } catch {
      // Keep the existing list if a refresh fails.
    }
  }, [base]);

  useEffect(() => {
    fetchStudents().finally(() => setLoading(false));
  }, [fetchStudents]);

  // Refetch instantly when the server reports a dashboard-relevant mutation.
  useRealtimeDashboard(fetchStudents);

  if (loading) return <DashboardLoading role={user?.role} />;
  const filtered = students.filter((student) => {
    const matchesSearch =
      `${student.user?.fullName} ${student.user?.email} ${student.course} ${student.companyPlacement}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesProgram = !programFilter || student.course === programFilter;
    return matchesSearch && matchesProgram;
  });

  return (
    <DashboardShell
      role={user.role}
      title={isCoordinator ? "Coordinator Dashboard" : "Registrar Dashboard"}
      subtitle={
        isCoordinator
          ? "Review student profiles and submit final performance evaluations."
          : "View student records, OJT placement, and completed certificates."
      }
    >
      <div className="relative z-20 mb-5 rounded-2xl border border-white/35 bg-white/25 p-3 shadow-sm backdrop-blur-md sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5E7867]">
            Student records
          </p>
          <span className="text-sm text-navy/65">
            {filtered.length} student record{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            className={`input-field min-w-0 flex-1 bg-white/65 ${
              /^\d+$/.test(search.trim()) ? "numeric-value" : ""
            }`}
            placeholder="Search student records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={programMenuOpen}
              aria-label="Filter students by program"
              onClick={() => setProgramMenuOpen((open) => !open)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-white/55 bg-white/65 px-4 py-3 text-left text-sm text-navy shadow-inner transition hover:bg-white/80 focus:border-forest focus:outline-none focus:ring-2 focus:ring-[#abd1b5]/60"
            >
              <span className="truncate">
                {programFilter || "All programs"}
              </span>
              <span
                aria-hidden="true"
                className={`text-xs text-[#5E7867] transition-transform ${programMenuOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>
            {programMenuOpen && (
              <div
                role="listbox"
                aria-label="Programs"
                className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-white/55 bg-[#edf7ef]/95 p-1.5 shadow-[0_16px_35px_rgba(15,30,53,0.16)] backdrop-blur-xl"
              >
                {["", ...PROGRAMS].map((program) => (
                  <button
                    key={program || "all-programs"}
                    type="button"
                    role="option"
                    aria-selected={programFilter === program}
                    onClick={() => {
                      setProgramFilter(program);
                      setProgramMenuOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      programFilter === program
                        ? "bg-[#dfeecf] font-semibold text-[#5E7867]"
                        : "text-navy hover:bg-white/75"
                    }`}
                  >
                    {program || "All programs"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(search || programFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setProgramFilter("");
                setProgramMenuOpen(false);
              }}
              className="shrink-0 text-left text-sm font-semibold text-[#5E7867] hover:text-navy hover:underline lg:px-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3 md:hidden">
        {filtered.map((student) => {
          const complete =
            (student.completedOJTHours || 0) >=
            (student.requiredOJTHours || 0);
          return (
            <article
              key={student._id}
              className="space-y-3 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-[#5E7867]">
                  {student.user?.fullName}
                </p>
                <p className="break-all text-sm text-navy/65">
                  {student.user?.email}
                </p>
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <dt className="font-medium text-navy/65">Program</dt>
                <dd className="break-words text-right text-navy">
                  {student.course || student.department || "Not specified"}
                </dd>
                <dt className="font-medium text-navy/65">Company</dt>
                <dd className="break-words text-right text-navy">
                  {student.companyPlacement || "Not assigned"}
                </dd>
                <dt className="font-medium text-navy/65">Hours</dt>
                <dd className="text-right text-navy">
                  {student.completedOJTHours || 0} /{" "}
                  {student.requiredOJTHours || 0} hours
                </dd>
                <dt className="font-medium text-navy/65">Status</dt>
                <dd className="text-right text-navy">
                  {student.assessmentSubmittedAt
                    ? "Assessment complete"
                    : complete
                      ? "Ready for assessment"
                      : "OJT in progress"}
                </dd>
              </dl>
              <Link
                className="btn-secondary w-full px-3 py-2 text-xs"
                to={`${base}/students/${student._id}`}
              >
                View details
              </Link>
            </article>
          );
        })}
      </div>
      <div className="relative z-0 hidden overflow-x-auto rounded-2xl border border-white/35 bg-white/45 shadow-sm backdrop-blur-md md:block">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-navy/65">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Program</th>
              <th className="p-4">Company / Hours</th>
              <th className="p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="p-10 text-center text-sm text-navy/65"
                >
                  No student records match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((student) => {
              const complete =
                (student.completedOJTHours || 0) >=
                (student.requiredOJTHours || 0);
              return (
                <tr
                  key={student._id}
                  className="border-b border-black/5 last:border-0"
                >
                  <td className="p-4">
                    <p className="font-semibold text-[#5E7867]">
                      {student.user?.fullName}
                    </p>
                    <p className="text-navy/65">{student.user?.email}</p>
                  </td>
                  <td className="p-4">
                    {student.course || student.department || "Not specified"}
                  </td>
                  <td className="p-4">
                    {student.companyPlacement || "Not assigned"}
                    <br />
                    <span className="text-xs text-navy/65">
                      {student.completedOJTHours || 0} /{" "}
                      {student.requiredOJTHours || 0} hours
                    </span>
                  </td>
                  <td className="p-4">
                    {student.assessmentSubmittedAt
                      ? "Assessment complete"
                      : complete
                        ? "Ready for assessment"
                        : "OJT in progress"}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      className="btn-secondary px-3 py-2 text-xs"
                      to={`${base}/students/${student._id}`}
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
};

export default ManageStaffStudents;
