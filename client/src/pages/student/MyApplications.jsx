import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = () => {
    setLoading(true);
    api
      .get("/applications/mine")
      .then(({ data }) => setApplications(data.applications))
      .finally(() => setLoading(false));
  };

  useEffect(loadApplications, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm("Withdraw this application? This cannot be undone."))
      return;
    await api.delete(`/applications/${id}`);
    loadApplications();
  };

  if (loading) return <DashboardLoading role="student" />;

  return (
    <DashboardShell
      role="student"
      title="My Applications"
      subtitle="Track the status of every OJT application you've submitted."
    >
      <div className="row-shell rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
        <div className="row-list divide-y divide-black/10">
          {applications.length === 0 && (
            <div className="p-8 text-center text-navy/65">
              No applications yet.{" "}
              <Link to="/jobs" className="text-[#457D53] hover:underline">
                Browse OJT openings
              </Link>
            </div>
          )}
          {applications.map((app) => (
            <div
              key={app._id}
              className="row-item flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-navy">{app.job?.title}</p>
                <p className="text-sm text-navy/65">
                  {app.company?.companyName}
                </p>
                <p className="mt-1 text-xs text-navy/65">
                  Applied {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge status={app.status} />
                {["in_review", "interview_scheduled"].includes(app.status) && (
                  <button
                    onClick={() => handleWithdraw(app._id)}
                    className="text-xs font-medium text-[#DF2E1B] hover:underline"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
};

export default MyApplications;
