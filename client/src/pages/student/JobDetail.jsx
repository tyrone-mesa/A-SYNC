import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";

const MIN_HOURS_FOR_FULLTIME = 300;

const JobDetail = ({ job: modalJob, onClose, modal = false }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(modalJob || null);
  const [studentHours, setStudentHours] = useState(null); // null until loaded for a logged-in student
  const [loading, setLoading] = useState(true);
  const [coverNote, setCoverNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState(null);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (modalJob) {
      setJob(modalJob);
      setLoading(false);
      return;
    }

    const requests = [api.get(`/jobs/${id}`)];
    if (user?.role === "student") requests.push(api.get("/students/me"));

    Promise.all(requests)
      .then(([jobRes, studentRes]) => {
        setJob(jobRes.data.job);
        if (studentRes)
          setStudentHours(studentRes.data.profile.completedOJTHours || 0);
      })
      .finally(() => setLoading(false));
  }, [id, user, modalJob]);

  const handleApply = async () => {
    if (!user) return navigate("/login");
    if (user.role !== "student") return;

    setApplying(true);
    setMessage(null);
    try {
      await api.post("/applications", { jobId: id, coverNote });
      setMessage({
        type: "success",
        text: "Application submitted successfully!",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to apply.",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleMessageCompany = async () => {
    if (!user) return navigate("/login");
    setMessaging(true);
    try {
      const { data } = await api.post("/messages/conversations", {
        otherUserId: job.company.user,
        jobId: job._id,
      });
      navigate(`/messages/${data.conversation._id}`);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to start conversation.",
      });
    } finally {
      setMessaging(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!job)
    return (
      <div className="p-10 text-center text-navy/65">
        Job posting not found.
      </div>
    );

  const slotsLeft = Math.max(job.slotsAvailable - job.slotsFilled, 0);
  const isFullTime = job.jobType === "Full-Time Job";
  const isAcceptingApplications = job.status === "open" && slotsLeft > 0;
  const isEligible =
    !isFullTime ||
    user?.role !== "student" ||
    (studentHours ?? 0) >= MIN_HOURS_FOR_FULLTIME;

  return (
    <motion.div
      initial={modal ? { opacity: 0, y: 18 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={
        modal ? "mx-auto w-full" : "mx-auto max-w-3xl px-4 py-10 sm:px-6"
      }
    >
      <motion.div
        initial={
          modal
            ? { opacity: 0, scale: 0.97, filter: "blur(3px)" }
            : { opacity: 0 }
        }
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`${modal ? "rounded-[28px] border border-[#dfe7df] bg-[#FBF8F3] p-5 shadow-[0_24px_60px_rgba(15,30,53,0.15)] sm:p-6" : "card p-8"}`}
      >
        {modal && (
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#e3eae3] pb-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-[#dfe6df] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F1E35]/75 transition hover:border-[#b9d98e] hover:text-[#0b5d3d]"
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0F1E35]/55">
              Job details
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span
              className={`mb-2 inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${isFullTime ? "border-[#d6e7c3] bg-[#a8d38d] text-[#0b5d3d]" : "border-[#dfeecf] bg-[#edf7df] text-[#0b5d3d]"}`}
            >
              {job.jobType || "OJT"}
            </span>
            <h1 className="font-display font-bold text-[2rem] leading-tight text-[#0F1E35]">
              {job.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-[12px] font-medium text-[#0F1E35]/65">
                {job.company?.companyName} · {job.department}
              </p>
              {user?.role === "student" && (
                <button
                  onClick={handleMessageCompany}
                  disabled={messaging}
                  className="text-[11px] font-semibold text-[#0b5d3d] hover:underline"
                >
                  {messaging ? "Opening…" : "Message Company"}
                </button>
              )}
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[9px] font-bold ${slotsLeft > 0 ? "bg-[#edf7df] text-[#0b5d3d]" : "bg-[#FEECEA] text-[#C74E3C]"}`}
          >
            {slotsLeft > 0 ? `${slotsLeft} slots open` : "Slots full"}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-[#0F1E35]/65">
          <span>{job.location}</span>
          <span>·</span>
          <span>{job.workSetup}</span>
          <span>·</span>
          <span>{job.minHoursPerWeek} hrs/week</span>
          <span>·</span>
          <span>{job.stipend}</span>
        </div>

        <h2 className="mb-2 font-display text-[1.6rem] font-bold text-[#0F1E35]">
          About this role
        </h2>
        <p className="mb-6 whitespace-pre-line text-[14px] leading-relaxed text-[#0F1E35]/70">
          {job.description}
        </p>

        {job.responsibilities?.length > 0 && (
          <>
            <h2 className="mb-2 font-display text-[1.3rem] font-bold text-[#0F1E35]">
              Responsibilities
            </h2>
            <ul className="mb-6 list-disc space-y-1 pl-5 text-[14px] text-[#0F1E35]/70">
              {job.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mb-2 font-display text-[1.3rem] font-bold text-[#0F1E35]">
          Skills Required
        </h2>
        <div className="mb-8 flex flex-wrap gap-2">
          {job.skillsRequired?.map((s) => (
            <span
              key={s}
              className="inline-flex items-center justify-center rounded-full border border-[#dde7df] bg-[#edf5ef] px-2.5 py-1 text-[10px] font-semibold text-[#0F1E35]/75"
            >
              {s}
            </span>
          ))}
        </div>

        {(!user || user.role === "student") && (
          <div className="border-t border-[#e3eae3] pt-6">
            {!isAcceptingApplications && (
              <div className="mb-4 rounded-[14px] border border-[#f7c6bd] bg-[#fff1ee] px-4 py-3 text-[12px] font-medium text-[#b4432f]">
                {job.status === "closed"
                  ? "This company is not currently accepting applications for this posting."
                  : "This posting has no remaining slots."}
              </div>
            )}
            {!isEligible && (
              <div className="mb-4 rounded-[14px] border border-[#f0d7a2] bg-[#fff7ea] px-4 py-3 text-[12px] font-medium text-[#8d4f00]">
                Full-Time Job postings require at least {MIN_HOURS_FOR_FULLTIME}{" "}
                completed OJT hours. You currently have {studentHours ?? 0}.
                Keep timing in from your{" "}
                <Link
                  to="/student/dashboard"
                  className="font-semibold underline"
                >
                  dashboard
                </Link>{" "}
                to build up your hours.
              </div>
            )}

            {message && (
              <div
                className={`mb-4 rounded-[14px] border px-4 py-3 text-[12px] font-medium ${
                  message.type === "success"
                    ? "border-[#d6e7c3] bg-[#edf7df] text-[#0b5d3d]"
                    : "border-[#f7c6bd] bg-[#fff1ee] text-[#b4432f]"
                }`}
              >
                {message.text}
              </div>
            )}

            <label
              className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0F1E35]/60"
              htmlFor="jobdetail-covernote"
            >
              Cover note (optional)
            </label>
            <textarea
              id="jobdetail-covernote"
              rows={3}
              disabled={!isEligible}
              className="mb-4 w-full resize-none rounded-[16px] border border-[#dfe6df] bg-white px-3 py-2 text-[13px] text-[#0F1E35] outline-none ring-0 placeholder:text-[#0F1E35]/40 focus:border-[#a8d38d] disabled:opacity-60"
              placeholder="Tell the company why you're a great fit…"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
            />

            <button
              onClick={handleApply}
              disabled={applying || !isAcceptingApplications || !isEligible}
              className="inline-flex items-center justify-center rounded-full bg-[#a8d38d] px-4 py-2.5 text-[11px] font-bold text-[#0b5d3d] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#e9ece8] disabled:text-[#0F1E35]/50"
            >
              {applying
                ? "Submitting…"
                : !isAcceptingApplications
                  ? "Applications closed"
                  : user
                    ? "Apply Now"
                    : "Log in to Apply"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default JobDetail;
