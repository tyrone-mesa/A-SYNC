import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Loader from "../../components/Loader";
import CourseSelect from "../../components/CourseSelect";
import YearLevelSelect from "../../components/YearLevelSelect";
import { useAuth } from "../../context/AuthContext";
import DashboardShell from "../../components/DashboardShell";
import AvatarCropper from "../../components/AvatarCropper";

const renderNumericEmail = (email) => {
  if (!email) return null;

  return email.split(/(\d+)/).map((part, index) =>
    /\d+/.test(part) ? (
      <span className="numeric-value" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ),
  );
};

const STUDENT_EMAIL_DOMAIN = "asiatech.edu.ph";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  studentId: "",
  password: "",
  course: "",
  yearLevel: "",
  department: "",
  requiredOJTHours: 480,
};

const ManageStudents = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarDraft, setAvatarDraft] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      student.user?.fullName,
      student.user?.email,
      student.course,
      student.department,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const loadStudents = () => {
    setLoading(true);
    api
      .get("/admin/students")
      .then(({ data }) => setStudents(data.students))
      .catch((err) => {
        setStudents([]);
        setError(
          err.response?.status === 401
            ? "Your admin session has expired. Please log in again."
            : err.response?.data?.message || "Unable to load student accounts.",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadStudents, []);

  const handleChange = (e) => {
    const value =
      e.target.name === "studentId"
        ? e.target.value.split("@")[0].trim()
        : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const payload = new FormData();
      const fullName = [form.firstName, form.middleName, form.lastName]
        .filter(Boolean)
        .join(" ");
      const email = `${form.studentId.trim()}@${STUDENT_EMAIL_DOMAIN}`;
      Object.entries({ ...form, email, fullName })
        .filter(
          ([key]) => !["firstName", "middleName", "lastName"].includes(key),
        )
        .forEach(([key, value]) => payload.append(key, value));
      if (avatarFile) payload.append("avatar", avatarFile);
      const { data } = await api.post("/admin/students", payload);
      setSuccessMessage(`Student account created for ${data.user.email}.`);
      setForm(emptyForm);
      setAvatarFile(null);
      loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create student account.",
      );
    } finally {
      setCreating(false);
    }
  };

  const resetOtp = async (student) => {
    try {
      const { data } = await api.post(
        `/admin/students/${student._id}/reset-otp`,
      );
      setSuccessMessage(
        `${data.message}${data.monthlyOtp ? ` Development OTP: ${data.monthlyOtp}` : ""}`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend student OTP.");
    }
  };

  return (
    <DashboardShell
      role={user?.role || "admin"}
      title={isAdmin ? "Manage Students" : "Student Roster"}
      subtitle={
        isAdmin
          ? `Only the admin office can create student accounts, using a @${STUDENT_EMAIL_DOMAIN} email.`
          : "Read-only view of every student account. Contact the admin office for changes."
      }
      actions={
        isAdmin ? (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setSuccessMessage("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
              showForm
                ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20"
                : "bg-[#dfeecf] text-[#5E7867] border border-forest/20 hover:brightness-95"
            }`}
          >
            {showForm ? "Cancel" : "+ Add Student"}
          </button>
        ) : null
      }
    >
      {successMessage && (
        <div className="mb-6 rounded-2xl border border-forest/20 bg-[#dfeecf] px-4 py-3 text-sm text-[#5E7867]">
          {successMessage}
        </div>
      )}

      {isAdmin && showForm && (
        <form
          onSubmit={handleCreate}
          className="student-form-times mb-8 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm space-y-5"
        >
          {error && (
            <div className="rounded-2xl border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-start-1 sm:row-start-1">
              <label className="label" htmlFor="managestudents-firstname">
                First Name
              </label>
              <input
                id="managestudents-firstname"
                name="firstName"
                required
                className="input-field"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-1 sm:row-start-2">
              <label className="label" htmlFor="managestudents-middlename">
                Middle Name (Optional)
              </label>
              <input
                id="managestudents-middlename"
                name="middleName"
                className="input-field"
                value={form.middleName}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-1 sm:row-start-3">
              <label className="label" htmlFor="managestudents-lastname">
                Last Name
              </label>
              <input
                id="managestudents-lastname"
                name="lastName"
                required
                className="input-field"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-2 sm:row-start-1">
              <label className="label" htmlFor="managestudents-studentid">
                School ID
              </label>
              <input
                id="managestudents-studentid"
                name="studentId"
                required
                placeholder="1-230250"
                className="input-field"
                value={form.studentId}
                onChange={handleChange}
              />
              <p className="student-form-times-text mt-1 text-xs text-navy/60">
                Login email: {form.studentId || "school-id"}@
                {STUDENT_EMAIL_DOMAIN}
              </p>
            </div>
            <div className="sm:col-start-2 sm:row-start-2">
              <label className="label" htmlFor="managestudents-password">
                Set Password
              </label>
              <input
                id="managestudents-password"
                type="text"
                name="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="input-field student-form-times-text"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-2 sm:row-start-3">
              <label className="label" htmlFor="managestudents-course">
                Course / Program
              </label>
              <CourseSelect
                id="managestudents-course"
                value={form.course}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-1 sm:row-start-4">
              <label className="label" htmlFor="managestudents-yearlevel">
                Year Level
              </label>
              <YearLevelSelect
                id="managestudents-yearlevel"
                required
                name="yearLevel"
                value={form.yearLevel}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-2 sm:row-start-4">
              <label className="label" htmlFor="managestudents-department">
                Department
              </label>
              <input
                id="managestudents-department"
                name="department"
                placeholder="e.g. Information Technology"
                className="input-field"
                value={form.department}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-start-2 sm:row-start-5">
              <label className="label" htmlFor="managestudents-goalhours">
                Goal Hours (Required OJT Hours)
              </label>
              <input
                id="managestudents-goalhours"
                type="number"
                min={0}
                name="requiredOJTHours"
                placeholder="e.g. 480"
                className="input-field"
                value={form.requiredOJTHours}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="managestudents-avatar">
                Student Profile Picture
              </label>
              <input
                id="managestudents-avatar"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > MAX_AVATAR_SIZE) {
                    setAvatarDraft(null);
                    setAvatarFile(null);
                    event.target.value = "";
                    setError("Profile picture must be 5 MB or smaller.");
                    return;
                  }
                  setError("");
                  setAvatarDraft(file);
                }}
                className="input-field student-form-times-text p-2 text-sm"
              />
              <p className="mt-1 text-xs text-navy/65">
                PNG, JPG, or PDF up to 5MB. Admin-managed only.
              </p>
            </div>
          </div>

          <p className="text-xs text-navy/65">
            The student logs in with this email and password directly — share
            both with them securely. They can change their password any time
            from the login page's "Forgot password?" link.
          </p>

          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? "Creating…" : "Create Student Account"}
          </button>
        </form>
      )}

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

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/30 bg-white/25 p-3 backdrop-blur-md">
        <input
          type="search"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`input-field bg-white/60 py-2.5 ${
            /^\d+$/.test(search.trim()) ? "numeric-value" : ""
          }`}
          aria-label="Search students"
        />
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
          <div className="divide-y divide-black/10">
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-navy/65">
                {students.length === 0
                  ? "No student accounts yet."
                  : "No students match your search."}
              </div>
            )}
            {filteredStudents.map((s) => (
              <Link
                key={s._id}
                to={`/admin/students/${s._id}`}
                className="flex items-center justify-between gap-4 py-4 transition hover:bg-navy/5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-navy">{s.user?.fullName}</p>
                  <p className="text-sm text-navy/65">
                    {renderNumericEmail(s.user?.email)} ·{" "}
                    {s.course || "No course set"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resetOtp(s);
                      }}
                      className="text-[#5E7867] text-xs font-medium hover:underline"
                    >
                      Reset &amp; Resend OTP
                    </button>
                  )}
                  <span className="badge bg-gray text-navy">
                    {s.completedOJTHours || 0}/{s.requiredOJTHours || 0} hrs
                  </span>
                  <span
                    className={`badge ${s.isProfileComplete ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20" : "bg-navy/10 text-navy/65"}`}
                  >
                    {s.isProfileComplete ? "Profile Complete" : "Incomplete"}
                  </span>
                  <span
                    className={`badge ${s.user?.isActive ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20" : "bg-coral/15 text-[#DF2E1B]"}`}
                  >
                    {s.user?.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default ManageStudents;
