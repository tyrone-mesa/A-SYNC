import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

// Simple horizontal bar list — no charting library is installed in this project, and this
// covers every breakdown here without adding one.
const BarList = ({ title, data, colorClass = "bg-gold" }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-navy mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-navy/65 text-sm">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-navy/70 capitalize">
                  {String(d.label).replace(/_/g, " ")}
                </span>
                <span className="text-navy font-medium">{d.count}</span>
              </div>
              <div className="h-2 rounded-full bg-navy/10 overflow-hidden">
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

  return (
    <DashboardShell
      title="Reports"
      subtitle={`Platform breakdowns as of ${new Date(report.generatedAt).toLocaleString()}.`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="card p-6">
            <p className="text-navy/65 text-sm">Average Completed OJT Hours</p>
            <p className="numeric-value font-bold text-3xl text-[#457D53] mt-1">
              {report.avgCompletedHours}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-navy/65 text-sm">Applications (last 6 months)</p>
            <p className="numeric-value font-bold text-3xl text-[#457D53] mt-1">
              {report.monthlyApplications.reduce((sum, m) => sum + m.count, 0)}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <BarList
            title="Students by Program"
            data={report.studentsByProgram}
          />
          <BarList
            title="Job Postings by Program"
            data={report.jobsByDepartment}
            colorClass="bg-forest"
          />
          <BarList
            title="Applications by Status"
            data={report.applicationsByStatus}
          />
          <BarList title="OJT vs Full-Time Postings" data={report.jobsByType} />
          <BarList
            title="Company Verification"
            data={report.companyVerification}
            colorClass="bg-forest"
          />
          <BarList
            title="Monthly Application Volume"
            data={report.monthlyApplications}
            colorClass="bg-gold"
          />
        </div>
      </div>
    </DashboardShell>
  );
};

export default Reports;
