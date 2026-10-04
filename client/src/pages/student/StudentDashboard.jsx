import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import TimeTracker from "../../components/TimeTracker";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [messagingAdmin, setMessagingAdmin] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/students/me"), api.get("/applications/mine")])
      .then(([profileRes, appsRes]) => {
        setProfile(profileRes.data.profile);
        setApplications(appsRes.data.applications);
      })
      .catch((error) => {
        setProfile(null);
        setApplications([]);
        setLoadError(
          error.response?.data?.message ||
            "Unable to load your dashboard. Please refresh and try again.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMessageAdmin = async () => {
    setMessagingAdmin(true);
    try {
      const { data } = await api.get("/messages/admins");
      const admin = data.admins?.[0];
      if (!admin) {
        window.alert("No admin support contact is available right now.");
        return;
      }

      const conversationRes = await api.post("/messages/conversations", {
        otherUserId: admin._id,
      });

      navigate(`/messages/${conversationRes.data.conversation._id}`);
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          "Failed to open a support conversation.",
      );
    } finally {
      setMessagingAdmin(false);
    }
  };

  if (loading) return <DashboardLoading role="student" />;

  if (!profile) {
    return (
      <DashboardShell role="student" title="Dashboard">
        <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-4 text-sm text-navy">
          {loadError || "Unable to load your dashboard."}
        </div>
      </DashboardShell>
    );
  }

  const stats = {
    total: applications.length,
    underReview: applications.filter((a) => a.status === "in_review").length,
    approved: applications.filter((a) => a.status === "approved").length,
  };

  return (
    <DashboardShell
      role="student"
      title="Dashboard"
      subtitle="Track your OJT applications and keep your profile ready for hiring teams."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMessageAdmin}
            disabled={messagingAdmin}
            className="btn-secondary text-sm px-4 py-2"
          >
            {messagingAdmin ? "Opening…" : "Message Admin"}
          </button>
          <Link
            to="/student/profile"
            className="btn-secondary text-sm px-4 py-2"
          >
            My Profile
          </Link>
        </div>
      }
    >
      {!profile?.isProfileComplete && (
        <div className="mb-6 rounded-xl border border-[#0b5d3d]/30 bg-[#0b5d3d]/10 px-4 py-3 text-sm text-[#0b5d3d]">
          <div className="flex items-center justify-between gap-4">
            <span>
              Your profile is incomplete. Complete it to start applying to OJT
              openings.
            </span>
            <Link
              to="/student/profile"
              className="font-semibold underline hover:text-[#084c2c]"
            >
              Complete Now
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm">
        <TimeTracker />
      </div>

      <div className="mb-6 rounded-[20px] border border-[#0b5d3d]/15 bg-[#f0f9f7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#0b5d3d]/25">
        <Link
          to="/student/interview"
          className="flex items-center justify-between gap-4"
        >
          <div>
            <h3 className="font-display font-semibold text-[#0b5d3d]">
              AI Interview Simulator
            </h3>
            <p className="mt-1 text-sm text-[#0F1E35]/60">
              Practice for a specific role — get tailored questions and
              instant AI scoring and feedback.
            </p>
          </div>
          <span className="btn-primary text-sm px-5 py-2.5">
            Practice Now
          </span>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Applications Sent", value: stats.total },
          { label: "Under Review", value: stats.underReview },
          { label: "Approved", value: stats.approved },
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

      <div className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
            Recent Applications
          </h2>
          <Link
            to="/student/applications"
            className="text-sm font-medium text-[#0b5d3d] hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="divide-y divide-black/10">
          {applications.length === 0 && (
            <div className="p-6 text-center text-sm text-navy/65">
              You haven&apos;t applied to any OJT openings yet. {" "}
              <Link to="/jobs" className="text-[#5E7867] hover:underline">
                Browse openings
              </Link>
            </div>
          )}
          {applications.slice(0, 5).map((app) => (
            <div
              key={app._id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-navy">{app.job?.title}</p>
                <p className="text-sm text-navy/65">
                  {app.company?.companyName}
                </p>
              </div>
              <StatusBadge status={app.status} />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
};

export default StudentDashboard;
