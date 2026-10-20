import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import TimeTracker from "../../components/TimeTracker";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";
import DocumentButtons from "../../components/DocumentButtons";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [messagingAdmin, setMessagingAdmin] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [profileRes, appsRes] = await Promise.all([
        api.get("/students/me"),
        api.get("/applications/mine"),
      ]);
      setProfile(profileRes.data.profile);
      setApplications(appsRes.data.applications);
    } catch (error) {
      setProfile(null);
      setApplications([]);
      setLoadError(
        error.response?.data?.message ||
          "Unable to load your dashboard. Please refresh and try again.",
      );
    }
  }, []);

  useEffect(() => {
    api
      .get("/completion/mine")
      .then(({ data }) => setCompletion(data))
      .catch(() => setCompletion(null));
  }, []);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  // Refetch instantly when the server reports a dashboard-relevant mutation.
  useRealtimeDashboard(fetchDashboard);

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

      {completion && (
        <div className="mb-4 rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
              OJT Completion
            </h2>
            <span
              className={`text-sm font-bold ${
                completion.state === "completed"
                  ? "text-[#5E7867]"
                  : completion.state === "ready_for_review"
                    ? "text-[#2F6FE4]"
                    : "text-navy/50"
              }`}
            >
              {completion.state === "completed"
                ? "Completed"
                : completion.state === "ready_for_review"
                  ? "Ready for admin verification"
                  : "In progress"}{" "}
              · {completion.percentage}%
            </span>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-navy/10">
            <div
              className="h-full rounded-full bg-forest transition-all"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {completion.requirements.map((requirement) => (
              <li
                key={requirement.key}
                className="flex items-center gap-2 text-navy/75"
              >
                <span
                  className={`font-bold ${
                    requirement.met ? "text-[#5E7867]" : "text-navy/35"
                  }`}
                >
                  {requirement.met ? "✓" : "○"}
                </span>
                <span className={requirement.met ? "" : "text-navy/50"}>
                  {requirement.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-[#0b5d3d]">
            My Documents
          </h2>
          <Link
            to="/student/profile"
            className="text-sm font-medium text-[#0b5d3d] hover:underline"
          >
            Manage
          </Link>
        </div>

        <div className="divide-y divide-black/10">
          {[
            {
              key: "resume",
              label: "Resume",
              url: profile.resumeUrl,
              name: profile.resumeOriginalName,
              path: `/students/${profile._id}/resume`,
            },
            {
              key: "transcript",
              label: "Transcript / COR",
              url: profile.transcriptUrl,
              name: profile.transcriptOriginalName,
              path: "/students/me/transcript",
            },
          ].map((doc) => (
            <div
              key={doc.key}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-medium text-navy">{doc.label}</p>
                <p className="truncate text-sm text-navy/65">
                  {doc.url ? doc.name || "Uploaded file" : "Not uploaded"}
                </p>
              </div>
              {doc.url ? (
                <DocumentButtons
                  path={doc.path}
                  name={doc.name}
                  label={doc.label}
                />
              ) : (
                <Link
                  to="/student/profile"
                  className="shrink-0 text-xs font-medium text-[#0b5d3d] hover:underline"
                >
                  Upload
                </Link>
              )}
            </div>
          ))}
        </div>
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
