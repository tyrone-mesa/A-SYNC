import React, { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import CourseSelect from "../../components/CourseSelect";
import YearLevelSelect from "../../components/YearLevelSelect";
import { useAuth } from "../../context/AuthContext";
import ExportButtons from "../../components/ExportButtons";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { openProtectedFile } from "../../utils/protectedFile";

const StudentProfile = () => {
  const { changePassword, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarMimeType, setAvatarMimeType] = useState("");
  const resumeInputRef = useRef(null);
  const transcriptInputRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const hasValue = (value) =>
    typeof value === "string" && value.trim().length > 0;
  const missingFields = profile
    ? [
        !hasValue(profile.course) && {
          key: "course",
          label: "Course / Program",
        },
        !hasValue(profile.yearLevel) && {
          key: "yearLevel",
          label: "Year Level",
        },
        !hasValue(profile.department) && {
          key: "department",
          label: "Preferred Department",
        },
        !hasValue(profile.phone) && { key: "phone", label: "Phone Number" },
        !hasValue(profile.address) && { key: "address", label: "Address" },
        !hasValue(profile.bio) && { key: "bio", label: "Short Bio" },
        (!profile.skills || !profile.skills.some(hasValue)) && {
          key: "skills",
          label: "Technical Skills",
        },
      ].filter(Boolean)
    : [];
  const isFieldMissing = (field) =>
    missingFields.some(({ key }) => key === field);

  useEffect(() => {
    api
      .get("/students/me")
      .then(({ data }) => setProfile(data.profile))
      .catch((error) => {
        setProfile(null);
        setLoadError(
          error.response?.data?.message ||
            "Unable to load your profile. Please refresh and try again.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let objectUrl = "";
    if (!profile?._id || !profile.avatarUrl) {
      setAvatarPreviewUrl("");
      setAvatarMimeType("");
      return undefined;
    }

    api
      .get("/students/me/avatar", { responseType: "blob" })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        setAvatarMimeType(data.type);
        setAvatarPreviewUrl(objectUrl);
      })
      .catch(() => {
        setAvatarPreviewUrl("");
        setAvatarMimeType("");
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?._id, profile?.avatarUrl]);

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !profile.skills.includes(skill)) {
      setProfile({ ...profile, skills: [...profile.skills, skill] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skill),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (missingFields.length > 0) {
      setMessage("Please complete all required profile fields before saving.");
      setShowIncompleteOnly(true);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { data } = await api.put("/students/me", {
        course: profile.course,
        yearLevel: profile.yearLevel,
        department: profile.department,
        skills: profile.skills,
        bio: profile.bio,
        phone: profile.phone,
        address: profile.address,
      });
      setProfile(data.profile);
      setMessage("Profile saved successfully.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (type, file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append(type, file);
      const { data } = await api.post(`/students/me/${type}`, formData);
      setProfile(data.profile);
      if (type === "resume") {
        setResumeFile(null);
        if (resumeInputRef.current) resumeInputRef.current.value = "";
      } else {
        setTranscriptFile(null);
        if (transcriptInputRef.current) transcriptInputRef.current.value = "";
      }
      setMessage(
        `${type === "resume" ? "Resume" : "Transcript"} uploaded successfully.`,
      );
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Upload failed. Please try a valid file.",
      );
    }
  };

  const deleteFile = async (type) => {
    if (
      !window.confirm(
        `Remove this ${type === "resume" ? "resume" : "transcript"}?`,
      )
    )
      return;

    try {
      const { data } = await api.delete(`/students/me/${type}`);
      setProfile(data.profile);
      if (type === "resume") {
        setResumeFile(null);
        if (resumeInputRef.current) resumeInputRef.current.value = "";
      } else {
        setTranscriptFile(null);
        if (transcriptInputRef.current) transcriptInputRef.current.value = "";
      }
      setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to remove the file.");
    }
  };

  const handlePasswordChange = (e) =>
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setPasswordMessage("Password updated successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "Failed to update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <DashboardLoading role="student" />;

  if (!profile) {
    return (
      <DashboardShell role="student" title="My Profile">
        <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-4 text-sm text-navy">
          {loadError || "Unable to load your profile."}
        </div>
      </DashboardShell>
    );
  }

  const isProfileIncomplete = missingFields.length > 0;
  const showField = (field) =>
    !showIncompleteOnly || missingFields.some(({ key }) => key === field);

  return (
    <DashboardShell
      role="student"
      title="My Profile"
      subtitle="Keep this updated — companies review it when you apply to an OJT opening."
      actions={
        <ExportButtons
          basePath="/students/me/export"
          fileBaseName={(user?.fullName || "my_profile").replace(/\s+/g, "_")}
        />
      }
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/15 px-4 py-3 text-sm text-[#457D53]">
          {message}
        </div>
      )}

      {profile.avatarUrl && (
        <section className="mb-6 rounded-[20px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy">
            Profile picture
          </h2>
          <p className="mt-1 text-xs text-navy/65">
            This picture is managed by the admin office. It cannot be edited or
            removed here and is excluded from all profile exports.
          </p>
          <div className="mt-4 flex justify-center sm:justify-start">
            {!avatarPreviewUrl ? (
              <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-black/10 bg-[#dfeae3] text-center text-xs text-navy/65">
                Loading profile...
              </div>
            ) : avatarMimeType === "application/pdf" ? (
              <iframe
                title="Your profile picture document"
                src={avatarPreviewUrl}
                className="h-56 w-full max-w-sm rounded-xl border border-black/10"
              />
            ) : (
              <img
                src={avatarPreviewUrl}
                alt="Your profile"
                className="h-40 w-40 rounded-2xl border border-black/10 object-cover shadow-sm"
                onContextMenu={(event) => event.preventDefault()}
                draggable="false"
              />
            )}
          </div>
        </section>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-[20px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm space-y-4"
      >
        {isProfileIncomplete && (
          <div className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-3 text-sm text-navy">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#DF2E1B]">
                  {missingFields.length} required{" "}
                  {missingFields.length === 1 ? "field" : "fields"} still need
                  attention
                </p>
                <p className="text-xs text-navy/70">
                  {missingFields.map(({ label }) => label).join(", ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteOnly((current) => !current)}
                className="btn-secondary h-8 px-3 text-xs"
                aria-pressed={showIncompleteOnly}
              >
                {showIncompleteOnly
                  ? "Show All Fields"
                  : "Show Incomplete Only"}
              </button>
            </div>
          </div>
        )}

        {!isProfileIncomplete && showIncompleteOnly && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-forest/20 bg-forest/10 px-3 py-3 text-sm text-[#5E7867]">
            <span>Your required profile details are complete.</span>
            <button
              type="button"
              onClick={() => setShowIncompleteOnly(false)}
              className="btn-secondary h-8 px-3 text-xs"
            >
              Show All Fields
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {showField("course") && (
            <div>
              <label
                className="label text-[11px]"
                htmlFor="studentprofile-course"
              >
                Course / Program{" "}
                {isFieldMissing("course") && (
                  <span className="text-[#DF2E1B]">Required</span>
                )}
              </label>
              <CourseSelect
                id="studentprofile-course"
                value={profile.course}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {showField("yearLevel") && (
            <div>
              <label
                className="label text-[11px]"
                htmlFor="studentprofile-yearlevel"
              >
                Year Level{" "}
                {isFieldMissing("yearLevel") && (
                  <span className="text-[#DF2E1B]">Required</span>
                )}
              </label>
              <YearLevelSelect
                id="studentprofile-yearlevel"
                name="yearLevel"
                className="input-field h-9 text-sm"
                value={profile.yearLevel}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {showField("department") && (
            <div>
              <label
                className="label text-[11px]"
                htmlFor="studentprofile-department"
              >
                Preferred Department{" "}
                {isFieldMissing("department") && (
                  <span className="text-[#DF2E1B]">Required</span>
                )}
              </label>
              <input
                id="studentprofile-department"
                name="department"
                placeholder="e.g. Information Technology"
                className="input-field h-9 text-sm"
                value={profile.department}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {showField("requiredOJTHours") && (
            <div>
              <p className="label text-[11px]">Goal Hours</p>
              <div className="input-field h-9 bg-gray/60 text-navy/70 cursor-not-allowed flex items-center justify-between text-sm">
                <span>{profile.requiredOJTHours || 0} hrs</span>
                <span className="text-[10px]">Admin</span>
              </div>
            </div>
          )}
          {showField("phone") && (
            <div>
              <label
                className="label text-[11px]"
                htmlFor="studentprofile-phone"
              >
                Phone Number{" "}
                {isFieldMissing("phone") && (
                  <span className="text-[#DF2E1B]">Required</span>
                )}
              </label>
              <input
                id="studentprofile-phone"
                name="phone"
                className="input-field h-9 text-sm"
                value={profile.phone}
                onChange={handleChange}
                required
              />
            </div>
          )}
        </div>

        {showField("address") && (
          <div>
            <label
              className="label text-[11px]"
              htmlFor="studentprofile-address"
            >
              Address{" "}
              {isFieldMissing("address") && (
                <span className="text-[#DF2E1B]">Required</span>
              )}
            </label>
            <input
              id="studentprofile-address"
              name="address"
              className="input-field h-9 text-sm"
              value={profile.address}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {showField("bio") && (
          <div>
            <label className="label text-[11px]" htmlFor="studentprofile-bio">
              Short Bio{" "}
              {isFieldMissing("bio") && (
                <span className="text-[#DF2E1B]">Required</span>
              )}
            </label>
            <textarea
              id="studentprofile-bio"
              name="bio"
              rows={2}
              className="input-field resize-none text-sm"
              value={profile.bio}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {showField("skills") && (
          <div>
            <label
              className="label text-[11px]"
              htmlFor="studentprofile-skillinput"
            >
              Technical Skills{" "}
              {isFieldMissing("skills") && (
                <span className="text-[#DF2E1B]">Required</span>
              )}
            </label>
            <div className="mb-2 flex gap-2">
              <input
                id="studentprofile-skillinput"
                className="input-field h-9 text-sm"
                placeholder="e.g. React, Figma, SQL"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <button
                type="button"
                onClick={addSkill}
                className="btn-secondary shrink-0 h-9 px-3 text-xs"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="badge border border-forest/35 bg-[#dfeecf] text-navy cursor-pointer text-xs font-semibold shadow-sm"
                  onClick={() => removeSkill(skill)}
                  title="Click to remove"
                >
                  {skill} <span aria-hidden="true">✕</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary h-9 px-4 text-sm"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      <div className="mt-4 rounded-[20px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm space-y-4">
        <h2 className="font-display font-semibold text-navy text-lg">
          Documents
        </h2>

        <div>
          <label className="label text-[11px]" htmlFor="studentprofile-resume">
            Resume{" "}
            {profile.resumeOriginalName && `— ${profile.resumeOriginalName}`}
          </label>
          <div className="flex items-center gap-2 w-full">
            <div className="file-upload-wrapper flex-1 min-w-0">
              <input
                id="studentprofile-resume"
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  setResumeFile(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
                className="file-upload-input"
              />
              <div
                className={`file-upload-display ${resumeFile ? "has-file" : ""}`}
              >
                {resumeFile ? resumeFile.name : "Choose File"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => uploadFile("resume", resumeFile)}
              className="btn-secondary shrink-0 h-9 px-3 text-xs"
            >
              Upload
            </button>
            {profile.resumeUrl && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    openProtectedFile(`/students/${profile._id}/resume`)
                  }
                  className="btn-secondary shrink-0 h-9 px-3 text-xs"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => deleteFile("resume")}
                  className="btn-danger shrink-0 h-9 px-3 text-xs"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <label
            className="label text-[11px]"
            htmlFor="studentprofile-transcript"
          >
            Transcript / COR{" "}
            {profile.transcriptOriginalName &&
              `— ${profile.transcriptOriginalName}`}
          </label>
          <div className="flex items-center gap-2 w-full">
            <div className="file-upload-wrapper flex-1 min-w-0">
              <input
                id="studentprofile-transcript"
                ref={transcriptInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  setTranscriptFile(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
                className="file-upload-input"
              />
              <div
                className={`file-upload-display ${transcriptFile ? "has-file" : ""}`}
              >
                {transcriptFile ? transcriptFile.name : "Choose File"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => uploadFile("transcript", transcriptFile)}
              className="btn-secondary shrink-0 h-9 px-3 text-xs"
            >
              Upload
            </button>
            {profile.transcriptUrl && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    openProtectedFile(`/students/${profile._id}/transcript`)
                  }
                  className="btn-secondary shrink-0 h-9 px-3 text-xs"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => deleteFile("transcript")}
                  className="btn-danger shrink-0 h-9 px-3 text-xs"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm space-y-4">
        <h2 className="font-display font-semibold text-navy text-lg">
          Change Password
        </h2>

        {passwordMessage && (
          <div className="rounded-xl border border-gold/40 bg-gold/15 px-3 py-2 text-xs text-[#457D53]">
            {passwordMessage}
          </div>
        )}
        {passwordError && (
          <div className="rounded-xl border border-coral/40 bg-coral/15 px-3 py-2 text-xs text-[#DF2E1B]">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label
              className="label text-[11px]"
              htmlFor="studentprofile-currentpassword"
            >
              Current Password
            </label>
            <input
              id="studentprofile-currentpassword"
              type="password"
              name="currentPassword"
              required
              className="input-field h-9 text-sm"
              placeholder="Your current password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="label text-[11px]"
                htmlFor="studentprofile-newpassword"
              >
                New Password
              </label>
              <input
                id="studentprofile-newpassword"
                type="password"
                name="newPassword"
                required
                minLength={6}
                className="input-field h-9 text-sm"
                placeholder="At least 6 characters"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
            </div>
            <div>
              <label
                className="label text-[11px]"
                htmlFor="studentprofile-confirmpassword"
              >
                Confirm New Password
              </label>
              <input
                id="studentprofile-confirmpassword"
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                className="input-field h-9 text-sm"
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            className="btn-primary h-9 px-4 text-sm"
          >
            {passwordSaving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
};

export default StudentProfile;
