import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

// Shared tile shell — matches the AdminDashboard analytics cards exactly.
const Tile = ({ label, value, accent = "text-[#0b5d3d]" }) => (
  <div className="rounded-[20px] border border-[#0b5d3d]/15 bg-[#f5fbf9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b5d3d]/30 hover:shadow-md hover:bg-[#f0f9f7]">
    <p className="text-sm text-[#0F1E35]/60">{label}</p>
    <p className={`numeric-value mt-2 text-3xl font-bold ${accent}`}>{value}</p>
  </div>
);

// Horizontal bar list — no charting library, dashboard-consistent styling.
const BarList = ({ title, data, colorClass = "bg-gold" }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-navy/60">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((d) => (
            <div key={d.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="capitalize text-navy/70">
                  {String(d.label).replace(/_/g, " ")}
                </span>
                <span className="numeric-value font-medium text-navy">
                  {d.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy/10">
                <div
                  className={`h-full rounded-full ${colorClass}`}
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Monthly volume — full-width trend card, the analytics centerpiece.
const MonthlyTrend = ({ data }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-[20px] border border-[#0b5d3d]/15 bg-[#f5fbf9] p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
          Monthly Application Volume
        </h3>
        <p className="numeric-value text-sm text-navy/60">
          {data.reduce((sum, m) => sum + m.count, 0)} total in the last{" "}
          {data.length} months
        </p>
      </div>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-navy/60">No data yet.</p>
      ) : (
        <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3">
          {data.map((m) => (
            <div
              key={m.label}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="numeric-value text-xs font-semibold text-[#0b5d3d] opacity-0 transition group-hover:opacity-100">
                {m.count}
              </span>
              <div
                className="w-full rounded-t-lg bg-forest/80 transition group-hover:bg-forest"
                style={{ height: `${Math.max((m.count / max) * 100, 4)}%` }}
              />
              <span className="text-[10px] uppercase tracking-wide text-navy/55">
                {String(m.label).slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Donut chart — pure SVG, no charting library. Composition data only.
const DONUT_COLORS = ["#6C8976", "#2F6FE4", "#ABD1B5", "#E74C3C", "#8A97A8"];

const Donut = ({ title, data }) => {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
        {title}
      </h3>
      {total === 0 ? (
        <p className="mt-4 text-sm text-navy/60">No data yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-6">
          <svg viewBox="0 0 140 140" className="h-36 w-36 flex-shrink-0">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#0F1E35"
              strokeOpacity="0.08"
              strokeWidth="18"
            />
            {data.map((d, idx) => {
              const fraction = d.count / total;
              const length = fraction * circumference;
              const segment = (
                <circle
                  key={d.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                  strokeWidth="18"
                  strokeDasharray={`${Math.max(length - 1.5, 0)} ${circumference}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return segment;
            })}
            <text
              x="70"
              y="66"
              textAnchor="middle"
              className="numeric-value"
              fontSize="22"
              fontWeight="700"
              fill="#0b5d3d"
            >
              {total}
            </text>
            <text
              x="70"
              y="84"
              textAnchor="middle"
              fontSize="9"
              fill="#0F1E35"
              opacity="0.55"
            >
              TOTAL
            </text>
          </svg>
          <ul className="min-w-0 flex-1 space-y-2">
            {data.map((d, idx) => (
              <li
                key={d.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-navy/70">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                    }}
                  />
                  <span className="capitalize">
                    {String(d.label).replace(/_/g, " ")}
                  </span>
                </span>
                <span className="numeric-value font-medium text-navy">
                  {d.count} · {Math.round((d.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const Reports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/reports")
      .then(({ data }) => setReport(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !report) return <DashboardLoading role="admin" />;

  const totalStudents = report.studentsByProgram.reduce(
    (sum, d) => sum + d.count,
    0,
  );
  const totalPostings = report.jobsByType.reduce((sum, d) => sum + d.count, 0);
  const totalApplications = report.applicationsByStatus.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  return (
    <DashboardShell
      title="Reports"
      subtitle={`Platform analytics as of ${new Date(report.generatedAt).toLocaleString()}.`}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile label="Total Students" value={totalStudents} />
          <Tile label="Job Postings" value={totalPostings} />
          <Tile label="Total Applications" value={totalApplications} />
          <Tile
            label="Avg Completed OJT Hours"
            value={report.avgCompletedHours}
          />
        </div>

        <MonthlyTrend data={report.monthlyApplications} />

        <div className="grid gap-4 md:grid-cols-2">
          <BarList title="Students by Program" data={report.studentsByProgram} />
          <BarList
            title="Job Postings by Program"
            data={report.jobsByDepartment}
            colorClass="bg-forest"
          />
          <Donut title="Applications by Status" data={report.applicationsByStatus} />
          <BarList
            title="OJT vs Full-Time Postings"
            data={report.jobsByType}
            colorClass="bg-forest"
          />
          <BarList
            title="Company Verification"
            data={report.companyVerification}
            colorClass="bg-forest"
          />
        </div>
      </div>
    </DashboardShell>
  );
};

export default Reports;
