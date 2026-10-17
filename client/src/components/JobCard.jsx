import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import CompanyLogo from "./CompanyLogo";

const MIN_HOURS_FOR_FULLTIME = 300;
const GRADIENTS = [
  "linear-gradient(135deg, #EEF7EE 0%, #DDEFD9 100%)",
  "linear-gradient(135deg, #F4F1FF 0%, #E2D9FF 100%)",
  "linear-gradient(135deg, #FFF5E8 0%, #F6D9B3 100%)",
  "linear-gradient(135deg, #EAF8FF 0%, #CFEAFF 100%)",
  "linear-gradient(135deg, #FDEEEE 0%, #FAD5D5 100%)",
  "linear-gradient(135deg, #F0FAF5 0%, #D7F3E3 100%)",
];

const formatTimeAgo = (date) => {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "Recently posted";

  const secondsAgo = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (secondsAgo < 60) return "Just now";

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d ago`;

  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 5) return `${weeksAgo}w ago`;

  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) return `${monthsAgo}mo ago`;

  return `${Math.floor(daysAgo / 365)}y ago`;
};

// Every card needs the student's hours and OJT-placement flag. Share one request between
// all the cards on screen instead of one /students/me call per card.
let studentInfoCache = { key: null, at: 0, promise: null };
const loadStudentInfo = (key) => {
  const fresh =
    studentInfoCache.key === key && Date.now() - studentInfoCache.at < 30000;
  if (!fresh) {
    const promise = api.get("/students/me").then(({ data }) => data);
    promise.catch(() => {
      if (studentInfoCache.promise === promise)
        studentInfoCache = { key: null, at: 0, promise: null };
    });
    studentInfoCache = { key, at: Date.now(), promise };
  }
  return studentInfoCache.promise;
};

const JobCard = ({ job, onSelect, match = null }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studentHours, setStudentHours] = useState(null);
  const [hasOjtPlacement, setHasOjtPlacement] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [gradientIndex] = useState(() =>
    Math.floor(Math.random() * GRADIENTS.length),
  );

  const slotsLeft = Math.max(job.slotsAvailable - job.slotsFilled, 0);
  const isFullTime = job.jobType === "Full-Time Job";
  const skills = job.skillsRequired || [];
  const gradient = GRADIENTS[gradientIndex];

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const postedTimeAgo = formatTimeAgo(job.createdAt || job.postedAt || now);

  useEffect(() => {
    if (user?.role !== "student") return;

    let cancelled = false;
    loadStudentInfo(user._id || user.id || "student")
      .then((data) => {
        if (cancelled) return;
        setStudentHours(data.profile?.completedOJTHours || 0);
        setHasOjtPlacement(Boolean(data.hasActiveOjtPlacement));
      })
      .catch(() => {
        if (!cancelled) setStudentHours(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // An approved OJT locks every other OJT posting; Full-Time Jobs keep the 300-hour gate.
  const ojtLocked = !isFullTime && user?.role === "student" && hasOjtPlacement;
  const isEligible =
    !ojtLocked &&
    (!isFullTime ||
      user?.role !== "student" ||
      (studentHours ?? 0) >= MIN_HOURS_FOR_FULLTIME);

  const handleApply = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return navigate("/login");
    if (user.role !== "student") {
      setApplyMessage("Only students can apply to openings.");
      return;
    }

    if (isFullTime && (studentHours ?? 0) < MIN_HOURS_FOR_FULLTIME) {
      setApplyMessage(
        `Full-Time jobs require at least ${MIN_HOURS_FOR_FULLTIME} completed OJT hours.`,
      );
      return;
    }

    try {
      setApplying(true);
      setApplyMessage("");
      await api.post("/applications", { jobId: job._id });
      setApplyMessage("Applied successfully.");
    } catch (err) {
      setApplyMessage(
        err.response?.data?.message || "Unable to apply right now.",
      );
    } finally {
      setApplying(false);
    }
  };

  const handleCardSelect = (e) => {
    if (!onSelect) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(job);
  };

  return (
    <Link
      to={`/jobs/${job._id}`}
      onClick={onSelect ? handleCardSelect : undefined}
      className="group flex h-full min-h-[284px] w-full flex-1 flex-col self-stretch overflow-hidden rounded-[28px] border border-[#f0f0f0] bg-white shadow-[0_8px_20px_rgba(15,30,53,0.04)] transition-all duration-300 hover:-translate-y-[3px] hover:scale-[1.01] hover:border-[#b9d6a7] hover:shadow-[0_18px_44px_rgba(11,93,61,0.16)] focus-visible:-translate-y-[3px] focus-visible:border-[#9fca89] focus-visible:shadow-[0_18px_44px_rgba(11,93,61,0.16)]"
    >
      <div className="px-4 pb-3 pt-4" style={{ backgroundImage: gradient }}>
        <div className="flex flex-col gap-3">
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex min-h-[22px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[8px] font-extrabold tracking-[0.12em] uppercase ${
                  isFullTime
                    ? "border-[#d6e7c3] bg-[#a8d38d] text-[#0b5d3d]"
                    : "border-[#dfeecf] bg-[#edf7df] text-[#0b5d3d]"
                }`}
              >
                {job.jobType || "OJT"}
              </span>
              {job.department && (
                <span className="inline-flex min-h-[22px] items-center justify-center rounded-full border border-[#dfe6df] bg-[#edf5ef] px-2.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[#0b5d3d]">
                  {job.department}
                </span>
              )}
            </div>

            <span className="inline-flex min-h-[22px] shrink-0 items-center justify-center rounded-full border border-[#e7ece7] bg-[#f7faf7] px-2.5 py-0.5 text-[8px] font-semibold text-[#0F1E35]/70">
              {postedTimeAgo}
            </span>
          </div>

          <div className="space-y-2.5">
            <h3 className="min-h-[56px] font-display text-[1.13rem] font-black leading-[1.15] text-[#0F1E35] tracking-[-0.03em] transition-colors duration-200 group-hover:text-[#0b5d3d]">
              {job.title}
            </h3>

            {match && match.score >= 40 && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span
                  className="text-sm font-bold text-[#5E7867]"
                  title={match.reasons.join(" · ")}
                >
                  {match.score}% match
                </span>
                {match.reasons.slice(0, 2).map((reason) => (
                  <span
                    key={reason}
                    className="text-[10px] font-medium text-[#0F1E35]/55"
                  >
                    · {reason}
                  </span>
                ))}
              </p>
            )}

            <div className="flex items-center gap-2">
              <CompanyLogo company={job.company} className="h-8 w-8" />
              <p className="min-h-[18px] text-[11px] font-semibold text-[#0F1E35]/70">
                {job.company?.companyName}
              </p>
            </div>
          </div>

          <div className="flex min-h-[18px] flex-wrap gap-1.5">
            {skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center justify-center rounded-full border border-[#dfe6df] bg-[#f8faf7] px-1.5 py-0.5 text-[8px] font-semibold text-[#0F1E35]/75"
              >
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="inline-flex items-center justify-center rounded-full border border-[#dfe6df] bg-[#f8faf7] px-1.5 py-0.5 text-[8px] font-semibold text-[#0F1E35]/70">
                +{skills.length - 3}
              </span>
            )}
          </div>

          {job.stipend && (
            <p className="min-h-[18px] text-[16px] font-black tracking-[-0.03em] text-[#0b5d3d]">
              {job.stipend}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between bg-[#ffffff] px-4 pb-4 pt-3.5">
        <div className="flex min-h-[18px] items-center justify-between gap-2 text-[9.5px] font-medium text-[#0F1E35]/70">
          <span className="line-clamp-1">
            {job.location} · {job.workSetup}
          </span>
          <span
            className={
              slotsLeft > 0
                ? "rounded-full bg-[#edf7df] px-2 py-0.5 font-extrabold text-[#0b5d3d]"
                : "rounded-full bg-[#FEECEA] px-2 py-0.5 font-extrabold text-[#C74E3C]"
            }
          >
            {slotsLeft > 0
              ? `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} open`
              : "Slots full"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleApply}
            disabled={
              applying ||
              slotsLeft === 0 ||
              !isEligible ||
              user?.role === "company" ||
              user?.role === "admin"
            }
            className={`inline-flex min-h-[34px] items-center justify-center rounded-full px-3.5 py-1.5 text-[9px] font-black tracking-[0.04em] uppercase transition ${
              applying ||
              slotsLeft === 0 ||
              !isEligible ||
              user?.role === "company" ||
              user?.role === "admin"
                ? "cursor-not-allowed bg-[#e8e8e8] text-[#0F1E35]/50"
                : "bg-[#a8d38d] text-[#0b5d3d] shadow-[0_8px_16px_rgba(168,211,141,0.2)] hover:shadow-[0_12px_20px_rgba(168,211,141,0.26)] hover:-translate-y-0.5 active:scale-95"
            }`}
          >
            {applying
              ? "Applying…"
              : !user
                ? "Login to apply"
                : user.role === "admin"
                  ? "Admin View"
                  : user.role === "company"
                    ? "Company View"
                    : ojtLocked
                      ? "OJT placed"
                      : !isEligible
                      ? `Need ${MIN_HOURS_FOR_FULLTIME} hrs`
                      : "Apply Now"}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onSelect) onSelect(job);
            }}
            className="inline-flex min-h-[34px] items-center justify-center rounded-full border border-[#e5e5e5] bg-[#f9f7f4] px-3.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.03em] text-[#0F1E35]/70 transition duration-200 hover:-translate-y-0.5 hover:border-[#d0dcc0] hover:text-[#0b5d3d] hover:bg-white hover:shadow-sm active:scale-95"
          >
            Details
          </button>
        </div>
      </div>

      {applyMessage && (
        <p className="mt-2 text-[9px] font-medium text-[#C74E3C]">
          {applyMessage}
        </p>
      )}
    </Link>
  );
};

export default JobCard;
