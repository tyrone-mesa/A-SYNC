import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import CourseSelect from "../../components/CourseSelect";
import YearLevelSelect from "../../components/YearLevelSelect";
import { useAuth } from "../../context/AuthContext";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { openProtectedFile } from "../../utils/protectedFile";
import AvatarCropper from "../../components/AvatarCropper";
import { resolveFileUrl } from "../../utils/fileUrl";

const DOC_STATUS_LABELS = {
  none: "",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};
const DOC_STATUS_STYLES = {
  pending: "text-[#b8860b]",
  approved: "text-[#5E7867]",
  rejected: "text-[#DF2E1B]",
};

const EVAL_CRITERIA = [
  ["workQuality", "Quality of Work"],
  ["productivity", "Productivity"],
  ["communication", "Communication"],
  ["punctuality", "Punctuality & Attendance"],
  ["teamwork", "Teamwork"],
  ["initiative", "Initiative"],
];

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canViewDocuments = isAdmin || user?.role === "coordinator";

  const assignCoordinator = async () => {
    setAssignBusy(true);
    try {
      await api.put(`/admin/students/${params.studentId}/assign-coordinator`, {
        coordinatorId: selectedCoordinator || null,
      });
      await load();
    } catch (err) {
      setManualHoursError(
        err.response?.data?.message || "Failed to assign the coordinator.",
      );
    } finally {
      setAssignBusy(false);
    }
  };

  const verifyCompletion = async () => {
    setVerifyBusy(true);
    try {
      await api.put(`/completion/verify/${params.studentId}`);
      await load();
    } catch (err) {
      setManualHoursError(
        err.response?.data?.message || "Failed to verify completion.",
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const [docReviewBusy, setDocReviewBusy] = useState(false);
  const [docRejecting, setDocRejecting] = useState(null);
  const [docReason, setDocReason] = useState("");

  const reviewDocument = async (type, action) => {
    if (action === "reject" && !docReason.trim()) return;
    setDocReviewBusy(true);
    try {
      await api.put(
        `/admin/students/${profile._id}/documents/${type}/review`,
        { action, reason: docReason.trim() },
      );
      setDocRejecting(null);
      setDocReason("");
      await load();
    } catch (err) {
      setManualHoursError(
        err.response?.data?.message || "Failed to review the document.",
      );
    } finally {
      setDocReviewBusy(false);
    }
  };

  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [journalEntries, setJournalEntries] = useState(null);
  const [openLog, setOpenLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarDraft, setAvatarDraft] = useState(null);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualHoursError, setManualHoursError] = useState("");
  const [manualHoursSuccess, setManualHoursSuccess] = useState("");
  const [addingHours, setAddingHours] = useState(false);
  const [assessment, setAssessment] = useState({
    performanceGrade: "",
    evaluation: "",
  });
  const [assessmentCertificate, setAssessmentCertificate] = useState(null);
  const [assessmentError, setAssessmentError] = useState("");
  const [assessmentBusy, setAssessmentBusy] = useState(false);

  const load = () => {
    setLoading(true);
    const endpoint =
      user?.role === "coordinator"
        ? `/staff/coordinator/students/${id}`
        : `/admin/students/${id}`;
    api
      .get(endpoint)
      .then(({ data }) => {
        setProfile(data.profile);
        setApplications(data.applications || []);
        setAttendanceLogs(data.attendanceLogs || []);
        setSelectedCoordinator(data.coordinator ? String(data.coordinator) : "");
        if (canViewDocuments) {
          api
            .get(`/journals/of-student/${params.studentId}`)
            .then(({ data }) => setJournalEntries(data.entries || []))
            .catch(() => setJournalEntries([]));
          api
            .get("/admin/users", { params: { role: "coordinator" } })
            .then(({ data }) => {
              const active = (data.users || []).filter((u) => u.isActive);
              setCoordinators(active);
            })
            .catch(() => setCoordinators([]));
          api
            .get(`/evaluations/of-student/${params.studentId}`)
            .then(({ data }) => setEvaluations(data.evaluations || []))
            .catch(() => setEvaluations([]));
        }
        setOpenLog(data.openLog || null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const toggleActive = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/users/${profile.user._id}/toggle-active`);
      load();
    } finally {
      setBusy(false);
    }
  };

  const startEditing = () => {
    setEditForm({
      fullName: profile.user?.fullName || "",
      studentId: profile.studentId || "",
      course: profile.course || "",
      yearLevel: profile.yearLevel || "",
      department: profile.department || "",
      requiredOJTHours: profile.requiredOJTHours || 0,
      completedOJTHours: profile.completedOJTHours || 0,
      password: "",
    });
    setSaveError("");
    setEditing(true);
  };

  const handleEditChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSaveError("");
    try {
      await api.put(`/admin/students/${id}`, editForm);
      setEditing(false);
      load();
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to save changes.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddHours = async () => {
    const value = Number(manualHours);
    if (!manualHours || Number.isNaN(value) || value === 0) {
      setManualHoursError("Enter a valid number of hours to add or subtract (use a negative number to subtract).");
      setManualHoursSuccess("");
      return;
    }

    setAddingHours(true);
    setManualHoursError("");
    setManualHoursSuccess("");

    try {
      const { data } = await api.put(`/admin/students/${id}/hours`, {
        hours: value,
      });
      setManualHours("");
      setManualHoursSuccess(data.message || `${Math.abs(value)} hour(s) ${value >= 0 ? "added" : "subtracted"}.`);
      load();
    } catch (err) {
      setManualHoursError(
        err.response?.data?.message || "Unable to update hours right now.",
      );
    } finally {
      setAddingHours(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Permanently delete ${profile.user?.fullName}'s account? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      await api.delete(`/admin/students/${id}`);
      navigate("/admin/students");
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    const payload = new FormData();
    payload.append("avatar", avatarFile);
    setBusy(true);
    setAvatarMessage("");
    try {
      const { data } = await api.post(`/admin/students/${id}/avatar`, payload);
      setProfile(data.profile);
      setAvatarFile(null);
      setAvatarMessage("Profile picture updated.");
    } catch (err) {
      setAvatarMessage(
        err.response?.data?.message || "Profile picture upload failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteAvatar = async () => {
    if (!window.confirm("Remove this student's profile picture?")) return;
    setBusy(true);
    setAvatarMessage("");
    try {
      const { data } = await api.delete(`/admin/students/${id}/avatar`);
      setProfile(data.profile);
      setAvatarMessage("Profile picture removed.");
    } catch (err) {
      setAvatarMessage(
        err.response?.data?.message || "Profile picture removal failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const viewAvatar = async () => {
    try {
      const response = await api.get(`/admin/students/${id}/avatar`, {
        responseType: "blob",
      });
      setAvatarPreview({
        url: window.URL.createObjectURL(response.data),
        type: response.data.type,
      });
    } catch (err) {
      setAvatarMessage(
        err.response?.data?.message || "Profile picture could not be opened.",
      );
    }
  };

  const closeAvatarPreview = () => {
    if (avatarPreview) window.URL.revokeObjectURL(avatarPreview.url);
    setAvatarPreview(null);
  };

  useEffect(
    () => () => {
      if (avatarPreview) window.URL.revokeObjectURL(avatarPreview.url);
    },
    [avatarPreview],
  );

  const submitAssessment = async (event) => {
    event.preventDefault();
    setAssessmentBusy(true);
    setAssessmentError("");
    try {
      const payload = new FormData();
      payload.append("performanceGrade", assessment.performanceGrade);
      payload.append("evaluation", assessment.evaluation);
      if (assessmentCertificate) {
        payload.append("certificate", assessmentCertificate);
      }
      await api.put(`/staff/coordinator/students/${id}/assessment`, payload);
      setAssessmentCertificate(null);
      load();
    } catch (err) {
      setAssessmentError(
        err.response?.data?.message || "Unable to submit assessment.",
      );
    } finally {
      setAssessmentBusy(false);
    }
  };

  if (loading || !profile) return <DashboardLoading role="admin" />;

  const goal = profile.requiredOJTHours || 0;
  const completed = profile.completedOJTHours || 0;
  const progressPct =
    goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;

  return (
    <DashboardShell
      role={user?.role || "admin"}
      title={profile.user?.fullName || "Student"}
      subtitle={profile.user?.email || ""}
      actions={
        <Link
          to={isAdmin ? "/admin/students" : "/coordinator/students"}
          className="btn-secondary px-4 py-2 text-sm"
        >
          ← Back
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`badge ${profile.user?.isActive ? "bg-gold/15 text-[#457D53]" : "bg-coral/15 text-[#DF2E1B]"}`}
          >
            {profile.user?.isActive ? "Active" : "Disabled"}
          </span>
          {isAdmin && (
            <>
              <button
                onClick={startEditing}
                className="btn-secondary text-xs py-2 px-3"
              >
                Edit
              </button>
              <button
                onClick={toggleActive}
                disabled={busy}
                className="btn-secondary text-xs py-2 px-3"
              >
                {profile.user?.isActive ? "Disable" : "Enable"}
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="btn-danger text-xs py-2 px-3"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-8 rounded-2xl border border-black/10 bg-navy/5 px-4 py-3 text-xs text-navy/65">
          Coordinator view — review this student's profile and OJT progress.
          Final assessments can only be submitted once.
        </div>
      )}

      {isAdmin && (
        <section className="mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy">
            Student profile picture
          </h2>
          <p className="mt-1 text-xs text-navy/65">
            Only an admin can upload, replace, view, or remove this file. It is
            excluded from student and company exports.
          </p>
          {avatarMessage && (
            <p className="mt-3 text-sm text-[#5E7867]">{avatarMessage}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={(event) =>
                setAvatarDraft(event.target.files?.[0] || null)
              }
              className="input-field max-w-full p-2 text-sm sm:max-w-xs"
            />
            <button
              type="button"
              onClick={uploadAvatar}
              disabled={!avatarFile || busy}
              className="btn-primary px-4 py-2 text-sm"
            >
              {profile.avatarUrl ? "Replace" : "Upload"}
            </button>
            {profile.avatarUrl && (
              <>
                <button
                  type="button"
                  onClick={viewAvatar}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={deleteAvatar}
                  disabled={busy}
                  className="btn-danger px-4 py-2 text-sm"
                >
                  Remove
                </button>
              </>
            )}
          </div>
          {avatarDraft && (
            <AvatarCropper
              file={avatarDraft}
              onCancel={() => setAvatarDraft(null)}
              onConfirm={(file) => {
                setAvatarFile(file);
                setAvatarDraft(null);
              }}
            />
          )}
          {profile.avatarOriginalName && (
            <p className="mt-2 text-xs text-navy/65">
              Current file: {profile.avatarOriginalName}
            </p>
          )}
        </section>
      )}

      {avatarPreview && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f3d2e]/70 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Student profile picture preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAvatarPreview();
          }}
        >
          <div className="relative flex max-h-full w-full max-w-2xl flex-col items-center rounded-[24px] border border-white/25 bg-[#f8faf8] p-4 shadow-[0_24px_70px_rgba(15,61,46,0.35)] sm:p-6">
            <button
              type="button"
              onClick={closeAvatarPreview}
              className="btn-secondary mb-4 self-end px-4 py-2 text-sm"
            >
              Back
            </button>
            {avatarPreview.type === "application/pdf" ? (
              <iframe
                src={avatarPreview.url}
                title="Student profile picture preview"
                className="h-[70vh] w-full rounded-xl border border-black/10 bg-white"
              />
            ) : (
              <img
                src={avatarPreview.url}
                alt="Student profile picture"
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}

      {!isAdmin && !profile.assessmentSubmittedAt && (
        <form
          onSubmit={submitAssessment}
          className="mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm space-y-4"
        >
          <h2 className="font-display text-xl font-semibold text-navy">
            Final performance assessment
          </h2>
          {assessmentError && (
            <div className="rounded-2xl border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
              {assessmentError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="studentdetail-grade">
                Grade
              </label>
              <input
                id="studentdetail-grade"
                className="input-field"
                required
                value={assessment.performanceGrade}
                onChange={(e) =>
                  setAssessment({
                    ...assessment,
                    performanceGrade: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-evaluation">
                Evaluation
              </label>
              <textarea
                id="studentdetail-evaluation"
                className="input-field min-h-28"
                required
                value={assessment.evaluation}
                onChange={(e) =>
                  setAssessment({ ...assessment, evaluation: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="studentdetail-certificate">
              Certificate (optional)
            </label>
            <input
              id="studentdetail-certificate"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="input-field"
              onChange={(event) =>
                setAssessmentCertificate(event.target.files?.[0] || null)
              }
            />
          </div>
          <button
            className="btn-primary px-4 py-2 text-sm"
            disabled={assessmentBusy || completed < goal}
          >
            {assessmentBusy
              ? "Submitting..."
              : completed < goal
                ? "Available after OJT completion"
                : "Submit final assessment"}
          </button>
        </form>
      )}
      {!isAdmin && profile.assessmentSubmittedAt && (
        <div className="mb-8 rounded-2xl border border-forest/20 bg-[#dfeecf] px-4 py-3 text-sm text-[#5E7867]">
          Final grade and evaluation submitted and locked.
        </div>
      )}
      {!isAdmin && profile.assessmentSubmittedAt && profile.certificateUrl && (
        <a
          href={resolveFileUrl(profile.certificateUrl)}
          target="_blank"
          rel="noreferrer"
          className="mb-8 inline-block text-sm font-semibold text-[#457D53] hover:underline"
        >
          View attached certificate
        </a>
      )}

      {isAdmin && editing && (
        <form
          onSubmit={handleSave}
          className="mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm space-y-5"
        >
          <h2 className="font-display text-xl font-semibold text-navy">
            Edit Student
          </h2>
          {saveError && (
            <div className="rounded-2xl border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
              {saveError}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="studentdetail-fullname">
                Full Name
              </label>
              <input
                id="studentdetail-fullname"
                name="fullName"
                className="input-field"
                value={editForm.fullName}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-studentid">
                School ID
              </label>
              <input
                id="studentdetail-studentid"
                name="studentId"
                className="input-field"
                placeholder="1-230250"
                value={editForm.studentId}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-password">
                New Password (Optional)
              </label>
              <input
                id="studentdetail-password"
                type="password"
                name="password"
                minLength={8}
                className="input-field"
                placeholder="Leave blank to keep current password"
                value={editForm.password}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-course">
                Course / Program
              </label>
              <CourseSelect
                id="studentdetail-course"
                value={editForm.course}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-yearlevel">
                Year Level
              </label>
              <YearLevelSelect
                id="studentdetail-yearlevel"
                name="yearLevel"
                value={editForm.yearLevel}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-department">
                Department
              </label>
              <input
                id="studentdetail-department"
                name="department"
                className="input-field"
                value={editForm.department}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-goalhours">
                Goal Hours (Required OJT Hours)
              </label>
              <input
                id="studentdetail-goalhours"
                type="number"
                min={0}
                name="requiredOJTHours"
                className="input-field"
                value={editForm.requiredOJTHours}
                onChange={handleEditChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="studentdetail-completedhours">
                Completed OJT Hours
              </label>
              <input
                id="studentdetail-completedhours"
                type="number"
                min={0}
                step="0.5"
                name="completedOJTHours"
                className="input-field"
                value={editForm.completedOJTHours}
                onChange={handleEditChange}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={`mb-8 grid gap-6 ${isAdmin ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-semibold text-navy">
            Academic Info
          </h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Course", profile.course || "—"],
              ["Year Level", profile.yearLevel || "—"],
              ["Department", profile.department || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-navy/65">{label}</dt>
                <dd className="text-navy">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {canViewDocuments && (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-semibold text-navy">
              OJT Journal
            </h2>
            {journalEntries === null ? (
              <p className="text-sm text-navy/60">Loading entries…</p>
            ) : journalEntries.length === 0 ? (
              <p className="text-sm text-navy/60">
                No journal entries yet.
              </p>
            ) : (
              <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                {journalEntries.map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-2xl border border-black/5 bg-white/70 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-navy">
                        {new Date(entry.entryDate).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <span
                        className={`text-sm font-bold ${
                          entry.status === "submitted"
                            ? "text-[#5E7867]"
                            : "text-navy/50"
                        }`}
                      >
                        {entry.status === "submitted" ? "Submitted" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-navy/80">
                      {entry.activities}
                    </p>
                    {entry.learnings && (
                      <p className="mt-1 text-sm italic text-navy/60">
                        {entry.learnings}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canViewDocuments && (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-navy">
                OJT Completion
              </h2>
              {completion && (
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
                      ? "Ready for verification"
                      : "In progress"}{" "}
                  · {completion.percentage}%
                </span>
              )}
            </div>
            {completion ? (
              <>
                <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-navy/10">
                  <div
                    className="h-full rounded-full bg-forest"
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
                {isAdmin && completion.state === "ready_for_review" && (
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={verifyCompletion}
                    className="btn-primary mt-4 h-9 px-4 text-sm"
                  >
                    {verifyBusy ? "Verifying…" : "Mark OJT Completed"}
                  </button>
                )}
                {completion.state === "completed" && completion.verifiedAt && (
                  <p className="mt-3 text-xs text-navy/55">
                    Verified on{" "}
                    {new Date(completion.verifiedAt).toLocaleDateString()}
                  </p>
                )}
                {isAdmin && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3 text-xs">
                    <span className="text-navy/60">Coordinator:</span>
                    <SelectDropdown
                      value={selectedCoordinator}
                      onChange={(e) => setSelectedCoordinator(e.target.value)}
                      options={coordinators.map((c) => ({
                        value: c._id,
                        label: c.fullName,
                      }))}
                      placeholder="Unassigned"
                      allowEmpty
                      className="input-field max-w-[220px] py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={assignBusy || !coordinators.length}
                      onClick={assignCoordinator}
                      className="btn-primary h-8 px-3 text-xs"
                    >
                      {assignBusy ? "Assigning…" : "Assign"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-navy/60">Loading completion…</p>
            )}
          </div>
        )}

        {canViewDocuments && (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-semibold text-navy">
              Company Evaluation
            </h2>
            {evaluations === null ? (
              <p className="text-sm text-navy/60">Loading evaluations…</p>
            ) : evaluations.length === 0 ? (
              <p className="text-sm text-navy/60">
                No company evaluation submitted yet.
              </p>
            ) : (
              <div className="space-y-5">
                {evaluations.map((evaluation) => (
                  <div
                    key={evaluation._id}
                    className="rounded-2xl border border-black/5 bg-white/70 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-navy">
                        {evaluation.company?.companyName || "Company"}
                      </p>
                      <span
                        className={`text-sm font-bold ${
                          evaluation.status === "final"
                            ? "text-[#5E7867]"
                            : "text-navy/50"
                        }`}
                      >
                        {evaluation.status === "final" ? "Final" : "Draft"}
                        {evaluation.submittedAt
                          ? ` · ${new Date(evaluation.submittedAt).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {EVAL_CRITERIA.map(([key, label]) => {
                        const score = Number(evaluation.ratings?.[key] || 0);
                        return (
                          <div key={key}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="text-navy/70">{label}</span>
                              <span className="numeric-value font-bold text-[#0b5d3d]">
                                {score}/5
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-navy/10">
                              <div
                                className="h-full rounded-full bg-forest"
                                style={{ width: `${(score / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {evaluation.overallComments && (
                      <p className="mt-3 text-sm italic text-navy/60">
                        {evaluation.overallComments}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canViewDocuments && (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-semibold text-navy">
              Documents
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-navy/65">Resume</span>
                  <span className="flex items-center gap-3">
                    {profile.resumeUrl ? (
                      <button
                        onClick={() =>
                          openProtectedFile(`/students/${profile._id}/resume`)
                        }
                        className="text-[#457D53] hover:underline"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-navy/65">Not uploaded</span>
                    )}
                    {DOC_STATUS_LABELS[profile.resumeStatus || "none"] && (
                      <span
                        className={`text-xs font-bold ${DOC_STATUS_STYLES[profile.resumeStatus]}`}
                      >
                        {DOC_STATUS_LABELS[profile.resumeStatus || "none"]}
                      </span>
                    )}
                  </span>
                </div>
                {profile.resumeUrl &&
                  ["pending", "rejected"].includes(profile.resumeStatus) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        disabled={docReviewBusy}
                        onClick={() => reviewDocument("resume", "approve")}
                        className="font-medium text-[#5E7867] hover:underline"
                      >
                        Approve
                      </button>
                      {docRejecting === "resume" ? (
                        <>
                          <input
                            type="text"
                            placeholder="Reason for rejection"
                            value={docReason}
                            onChange={(e) => setDocReason(e.target.value)}
                            className="input-field py-1 text-xs"
                          />
                          <button
                            type="button"
                            disabled={docReviewBusy || !docReason.trim()}
                            onClick={() => reviewDocument("resume", "reject")}
                            className="font-medium text-[#DF2E1B] hover:underline"
                          >
                            Confirm Rejection
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDocRejecting(null);
                              setDocReason("");
                            }}
                            className="text-navy/60 hover:underline"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={docReviewBusy}
                          onClick={() => setDocRejecting("resume")}
                          className="font-medium text-[#DF2E1B] hover:underline"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-navy/65">Transcript / COR</span>
                  <span className="flex items-center gap-3">
                    {profile.transcriptUrl ? (
                      <button
                        onClick={() =>
                          openProtectedFile(`/students/${profile._id}/transcript`)
                        }
                        className="text-[#457D53] hover:underline"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-navy/65">Not uploaded</span>
                    )}
                    {DOC_STATUS_LABELS[profile.transcriptStatus || "none"] && (
                      <span
                        className={`text-xs font-bold ${DOC_STATUS_STYLES[profile.transcriptStatus]}`}
                      >
                        {DOC_STATUS_LABELS[profile.transcriptStatus || "none"]}
                      </span>
                    )}
                  </span>
                </div>
                {profile.transcriptUrl &&
                  ["pending", "rejected"].includes(profile.transcriptStatus) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        disabled={docReviewBusy}
                        onClick={() => reviewDocument("transcript", "approve")}
                        className="font-medium text-[#5E7867] hover:underline"
                      >
                        Approve
                      </button>
                      {docRejecting === "transcript" ? (
                        <>
                          <input
                            type="text"
                            placeholder="Reason for rejection"
                            value={docReason}
                            onChange={(e) => setDocReason(e.target.value)}
                            className="input-field py-1 text-xs"
                          />
                          <button
                            type="button"
                            disabled={docReviewBusy || !docReason.trim()}
                            onClick={() => reviewDocument("transcript", "reject")}
                            className="font-medium text-[#DF2E1B] hover:underline"
                          >
                            Confirm Rejection
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDocRejecting(null);
                              setDocReason("");
                            }}
                            className="text-navy/60 hover:underline"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={docReviewBusy}
                          onClick={() => setDocRejecting("transcript")}
                          className="font-medium text-[#DF2E1B] hover:underline"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-navy">
            OJT Hours Progress
          </h2>
          <span className="text-sm text-navy/65">
            {completed} / {goal} hours
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#dfe8e0]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#214c3f] via-[#5d8f76] to-[#c4e1c1]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {isAdmin && (
          <div className="mt-5 rounded-2xl border border-black/5 bg-white p-4">
            <label className="label" htmlFor="studentdetail-manualhours">
              Add or subtract manual OJT hours
            </label>
            <div className="flex items-center gap-3">
              <input
                id="studentdetail-manualhours"
                type="number"
                step="0.5"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                className="input-field h-10"
                placeholder="e.g. 8"
              />
              <button
                type="button"
                onClick={handleAddHours}
                disabled={addingHours}
                className="btn-primary h-10 px-4 text-sm"
              >
                {addingHours ? "Applying…" : "Apply"}
              </button>
            </div>
            {manualHoursError && (
              <p className="mt-2 text-xs text-[#DF2E1B]">{manualHoursError}</p>
            )}
            {manualHoursSuccess && (
              <p className="mt-2 text-xs text-green-700">
                {manualHoursSuccess}
              </p>
            )}
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="space-y-6">
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-semibold text-navy">
              Attendance
            </h2>
            {openLog ? (
              <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/15 px-4 py-3 text-sm text-[#457D53]">
                Currently timed in: {new Date(openLog.timeIn).toLocaleString()}
              </div>
            ) : (
              <div className="mb-4 text-sm text-navy/65">
                No active time-in session.
              </div>
            )}

            {attendanceLogs.length === 0 ? (
              <div className="text-sm text-navy/65">
                No completed time entries yet.
              </div>
            ) : (
              <div className="space-y-2">
                {attendanceLogs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-navy/70">
                      {new Date(log.timeIn).toLocaleDateString()}
                    </span>
                    <span className="text-navy/65">
                      {new Date(log.timeIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(log.timeOut).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-semibold text-navy">
            Applications
          </h2>
          {applications.length === 0 ? (
            <div className="text-sm text-navy/65">
              No applications submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app._id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3"
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
          )}
        </div>
      )}
    </DashboardShell>
  );
};

export default StudentDetail;
