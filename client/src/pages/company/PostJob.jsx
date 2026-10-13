import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import SelectDropdown from "../../components/SelectDropdown";

const emptyJob = {
  jobType: "",
  title: "",
  department: "",
  description: "",
  responsibilities: "",
  skillsRequired: "",
  slotsAvailable: 1,
  location: "",
  workSetup: "On-site",
  minHoursPerWeek: 20,
  stipend: "Unpaid",
  applicationDeadline: "",
};

const PostJob = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const editing = Boolean(jobId);
  const [form, setForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;
    api
      .get(`/jobs/${jobId}`)
      .then(({ data }) => {
        const job = data.job;
        setForm({
          ...job,
          responsibilities: (job.responsibilities || []).join("\n"),
          skillsRequired: (job.skillsRequired || []).join(", "),
          applicationDeadline: job.applicationDeadline
            ? new Date(job.applicationDeadline).toISOString().slice(0, 10)
            : "",
        });
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load job posting.");
      });
  }, [jobId]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const [companyProfile, setCompanyProfile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);

  useEffect(() => {
    api
      .get("/companies/me")
      .then(({ data }) => setCompanyProfile(data.profile || null))
      .catch(() => setCompanyProfile(null));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobId && companyProfile) {
      const missing = [
        !companyProfile.industry && "industry",
        !companyProfile.address && "address",
        !companyProfile.contactPerson && "contact person",
        !companyProfile.contactPhone && "contact phone",
      ].filter(Boolean);
      if (missing.length) {
        setError(
          `Complete your company profile before posting a job or OJT opening. Missing: ${missing.join(", ")}. Finish it under Profile.`,
        );
        return;
      }
    }

    if (!form.jobType) {
      setError(
        "Select whether this posting is an OJT slot or a Full-Time Job.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        slotsAvailable: Number(form.slotsAvailable),
        minHoursPerWeek: Number(form.minHoursPerWeek),
        responsibilities: form.responsibilities
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        skillsRequired: form.skillsRequired
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach((v) => body.append(key, v));
        else body.append(key, value);
      });
      if (posterFile) body.append("poster", posterFile);
      const { data } = editing
        ? await api.put(`/jobs/${jobId}`, body)
        : await api.post("/jobs", body);
      navigate(
        editing ? "/company/jobs" : `/company/jobs/${data.job._id}/applicants`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="company"
      title={editing ? "Edit Job Posting" : "Post an Opening"}
      subtitle={
        editing
          ? "Update the details students see for this opening."
          : "Fill in the details students will see when browsing openings."
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
          {error}
        </div>
      )}

      {!jobId && companyProfile && (() => {
        const missing = [
          !companyProfile.industry && "industry",
          !companyProfile.address && "address",
          !companyProfile.contactPerson && "contact person",
          !companyProfile.contactPhone && "contact phone",
        ].filter(Boolean);
        return missing.length ? (
          <div className="mb-6 rounded-xl border border-[#b8860b]/40 bg-[#fdf6e3] px-4 py-3 text-sm text-[#7a5b12]">
            <p className="font-semibold">
              Complete your company profile to post a job or OJT opening.
            </p>
            <p className="mt-1">Still required: {missing.join(", ")}.</p>
          </div>
        ) : null;
      })()}

      <form
        onSubmit={handleSubmit}
        className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm space-y-5"
      >
        <fieldset>
          <legend className="label">Posting Type</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "OJT",
                title: "OJT",
                desc: "On-the-Job Training / internship slot",
              },
              {
                value: "Full-Time Job",
                title: "Full-Time Job",
                desc: "Regular paid position",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
                  form.jobType === opt.value
                    ? "border-gold bg-gold/10"
                    : "border-black/10 bg-white hover:bg-navy/5"
                }`}
              >
                <input
                  type="radio"
                  name="jobType"
                  value={opt.value}
                  checked={form.jobType === opt.value}
                  onChange={handleChange}
                  required
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-navy">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs text-navy/65">
                  {opt.desc}
                </span>
              </label>
            ))}
          </div>
          {form.jobType === "Full-Time Job" && (
            <p className="mt-2 text-xs text-navy/65">
              Note: students need at least 300 completed OJT hours before they
              can apply to Full-Time Job postings.
            </p>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="postjob-title">
            Job Title
          </label>
          <input
            id="postjob-title"
            name="title"
            required
            className="input-field"
            value={form.title}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="postjob-department">
              Department
            </label>
            <input
              id="postjob-department"
              name="department"
              required
              placeholder="e.g. Information Technology"
              className="input-field"
              value={form.department}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label" htmlFor="postjob-slots">
              Available Slots
            </label>
            <input
              id="postjob-slots"
              type="number"
              min={1}
              name="slotsAvailable"
              required
              className="input-field"
              value={form.slotsAvailable}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="postjob-description">
            Description
          </label>
          <textarea
            id="postjob-description"
            name="description"
            required
            rows={4}
            className="input-field resize-none"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="label" htmlFor="postjob-responsibilities">
            Responsibilities (one per line)
          </label>
          <textarea
            id="postjob-responsibilities"
            name="responsibilities"
            rows={3}
            className="input-field resize-none"
            placeholder={"Assist with QA testing\nDocument bug reports"}
            value={form.responsibilities}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="label" htmlFor="postjob-skills">
            Skills Required (comma separated)
          </label>
          <input
            id="postjob-skills"
            name="skillsRequired"
            className="input-field"
            placeholder="React, SQL, Communication"
            value={form.skillsRequired}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="postjob-location">
              Location
            </label>
            <input
              id="postjob-location"
              name="location"
              className="input-field"
              placeholder="e.g. Makati City"
              value={form.location}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label" htmlFor="postjob-worksetup">
              Work Setup
            </label>
                        <SelectDropdown
              id="postjob-worksetup"
              name="workSetup"
              className="input-field"
              value={form.workSetup}
              onChange={handleChange}
              options={[
                { value: "On-site", label: "On-site" },
                { value: "Remote", label: "Remote" },
                { value: "Hybrid", label: "Hybrid" },
              ]}
            />
          </div>
          <div>
            <label className="label" htmlFor="postjob-minhours">
              Min. Hours / Week
            </label>
            <input
              id="postjob-minhours"
              type="number"
              name="minHoursPerWeek"
              className="input-field"
              value={form.minHoursPerWeek}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label" htmlFor="postjob-stipend">
              {form.jobType === "Full-Time Job" ? "Salary Range" : "Stipend"}
            </label>
            <input
              id="postjob-stipend"
              name="stipend"
              placeholder={
                form.jobType === "Full-Time Job"
                  ? "₱25,000 – ₱32,000 / mo"
                  : "Unpaid"
              }
              className="input-field"
              value={form.stipend}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="postjob-deadline">
            Application Deadline (optional)
          </label>
          <input
            id="postjob-deadline"
            type="date"
            name="applicationDeadline"
            className="input-field"
            value={form.applicationDeadline}
            onChange={handleChange}
          />
        </div>

        <div className="sm:col-span-2">

          <label className="label">Advertising poster (optional)</label>

          <input

            type="file"

            accept="image/*"

            onChange={(e) => setPosterFile(e.target.files?.[0] || null)}

            className="input-field py-2 text-sm"

          />

          <p className="mt-1 text-xs text-navy/60">

            16:9 ratio recommended (720p to 4K). Featured in the Opportunities ad carousel.

          </p>

          {posterFile && (

            <img

              src={URL.createObjectURL(posterFile)}

              alt="Poster preview"

              className="mt-2 aspect-video w-full max-w-sm rounded-xl object-cover"

            />

          )}

        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : editing ? "Save Changes" : "Post Opening"}
        </button>
      </form>
    </DashboardShell>
  );
};

export default PostJob;
