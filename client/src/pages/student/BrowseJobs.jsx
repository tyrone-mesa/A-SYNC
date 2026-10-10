import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import api from "../../api/axios";
import JobCard from "../../components/JobCard";
import Loader, { SkeletonRow } from "../../components/Loader";
import Logo from "../../components/Logo";
import JobDetail from "./JobDetail";

const JOB_TYPE_TABS = [
  { value: "", label: "All" },
  { value: "OJT", label: "OJT" },
  { value: "Full-Time Job", label: "Full-Time Job" },
];

const browseStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const browseItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  },
};

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    keyword: "",
    department: "",
    skills: "",
    workSetup: "",
    jobType: "",
    salaryMin: 20000,
    salaryMax: 120000,
  });
  const prefersReducedMotion = useReducedMotion();

  const fetchJobs = useCallback((activeFilters) => {
    setLoading(true);
    setError("");
    const params = { limit: 1000 };
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined) return;
      if ((k === "salaryMin" || k === "salaryMax") && v === 20000) return;
      if ((k === "salaryMin" || k === "salaryMax") && v === 120000) return;
      params[k] = v;
    });
    api
      .get("/jobs", { params })
      .then(({ data }) => setJobs(data.jobs))
      .catch(() => {
        setJobs([]);
        setError(
          "The job listings are temporarily unavailable. Please try again in a moment.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get("/jobs/meta/departments")
      .then(({ data }) => setDepartments(data.departments))
      .catch(() => setDepartments([]));
    fetchJobs(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) =>
    setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleTabChange = (jobType) => {
    const next = { ...filters, jobType };
    setFilters(next);
    fetchJobs(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchJobs(filters);
  };

  const handleSalaryChange = (field, value) => {
    const nextValue = Number(value);
    const updated = { ...filters };

    if (field === "salaryMin") {
      updated.salaryMin = Math.min(nextValue, updated.salaryMax);
    }

    if (field === "salaryMax") {
      updated.salaryMax = Math.max(nextValue, updated.salaryMin);
    }

    setFilters(updated);
    fetchJobs(updated);
  };

  const clearFilters = () => {
    const cleared = {
      keyword: "",
      department: "",
      skills: "",
      workSetup: "",
      jobType: "",
      salaryMin: 20000,
      salaryMax: 120000,
    };
    setFilters(cleared);
    fetchJobs(cleared);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              key="job-detail-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-[#0F1E35]/25 px-4 py-4 backdrop-blur-[2px] sm:px-6 sm:py-6"
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 26,
                  scale: 0.97,
                  filter: "blur(4px)",
                }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(2px)" }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="my-auto w-full max-w-[760px]"
              >
                <JobDetail
                  job={selectedJob}
                  onClose={() => setSelectedJob(null)}
                  modal
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6 overflow-hidden rounded-[30px] border border-[#dfe8e0] bg-[#214c3f] shadow-[0_18px_40px_rgba(13,53,44,0.18)]"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          >
            <source src="/media/hero-intro-2.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(171,209,181,0.28),transparent_40%),linear-gradient(120deg,rgba(33,76,63,0.88),rgba(89,104,105,0.68))]" />

          <div className="relative z-10 px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pb-10">
            <div className="flex items-center justify-between gap-4 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner shadow-white/10">
                  <Logo size={34} className="drop-shadow-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">
                    ASIATECH <span className="text-[#c4e1c1]">SYNC</span>
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    Company Partners
                  </h2>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                {JOB_TYPE_TABS.map((tab) => (
                  <button
                    key={tab.value || "all"}
                    type="button"
                    onClick={() => handleTabChange(tab.value)}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                      filters.jobType === tab.value
                        ? "border-[#ABD1B5] bg-[#ABD1B5] text-[#1b3a32] shadow-sm"
                        : "border-white/15 bg-white/5 text-white/80 hover:-translate-y-0.5 hover:border-white/30 hover:text-white hover:shadow-sm"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-[260px] items-end">
              <div className="w-full max-w-[980px] rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-[0_24px_50px_rgba(11,93,61,0.25)] backdrop-blur-md sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center gap-2 text-white/80">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#a8d38d]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Find your next opportunity
                  </p>
                </div>

                <div className="mb-4 max-w-[620px]">
                  <h1 className="font-display text-3xl font-black leading-none text-white sm:text-4xl lg:text-5xl">
                    Discover OJT and job openings that match your goals.
                  </h1>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 rounded-[24px] border border-white/15 bg-white/85 p-3 shadow-[0_18px_30px_rgba(17,27,38,0.12)] backdrop-blur-md md:flex-row md:items-center"
                >
                  <div className="flex flex-1 items-center gap-2 rounded-full border border-[#dfe6df] bg-white px-4 py-3 text-[#0F1E35] shadow-inner">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-[#0b5d3d]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="6" />
                      <path d="M16 16L21 21" strokeLinecap="round" />
                    </svg>
                    <input
                      name="keyword"
                      className={`w-full border-0 bg-transparent text-sm text-[#0F1E35] placeholder:text-[#0F1E35]/55 focus:outline-none ${
                        /^\d+$/.test(filters.keyword.trim())
                          ? "numeric-value"
                          : ""
                      }`}
                      placeholder="Search by title, keyword, or skills..."
                      value={filters.keyword}
                      onChange={handleFilterChange}
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-full bg-[#ABD1B5] px-5 py-3 text-sm font-bold text-[#1d3b36] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md active:scale-[0.98]"
                  >
                    Search jobs
                  </button>
                </form>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="-mt-3 mb-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-bold text-[#214c3f] md:text-4xl">
              Available Openings
            </h1>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={browseStagger}
            className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]"
          >
            <motion.aside
              variants={browseItem}
              className="h-fit rounded-[28px] border border-white/25 bg-white/10 p-4 shadow-[0_18px_40px_rgba(14,35,31,0.12)] backdrop-blur-xl"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#18362d]">
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={() => clearFilters()}
                    className="text-[11px] font-semibold text-[#18362d] hover:text-[#0f2a24]"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-4 rounded-[20px] border border-white/30 bg-white/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0F1E35]">
                      Job Type
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPE_TABS.map((tab) => (
                      <button
                        key={tab.value || "all"}
                        type="button"
                        onClick={() => handleTabChange(tab.value)}
                        className={`inline-flex min-h-[30px] min-w-[78px] items-center justify-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-all ${
                          filters.jobType === tab.value
                            ? "border-[#a8d38d] bg-[#a8d38d] text-[#0b5d3d] shadow-sm"
                            : "border-white/40 bg-white/35 text-[#18362d] hover:border-white/60 hover:bg-white/45"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-[20px] border border-white/30 bg-white/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#18362d]">
                      Salary Range
                    </span>
                    <span className="text-[10px] font-semibold text-[#18362d]/80">
                      ₱{filters.salaryMin.toLocaleString()} - ₱
                      {filters.salaryMax.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label
                        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#18362d]/80"
                        htmlFor="browsejobs-salary-min"
                      >
                        Minimum
                      </label>
                      <input
                        id="browsejobs-salary-min"
                        type="range"
                        min="20000"
                        max="120000"
                        step="1000"
                        value={filters.salaryMin}
                        onChange={(e) =>
                          handleSalaryChange("salaryMin", e.target.value)
                        }
                        className="h-2 w-full cursor-pointer accent-[#1B7A3E]"
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#18362d]/80"
                        htmlFor="browsejobs-salary-max"
                      >
                        Maximum
                      </label>
                      <input
                        id="browsejobs-salary-max"
                        type="range"
                        min="20000"
                        max="120000"
                        step="1000"
                        value={filters.salaryMax}
                        onChange={(e) =>
                          handleSalaryChange("salaryMax", e.target.value)
                        }
                        className="h-2 w-full cursor-pointer accent-[#1B7A3E]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[20px] border border-white/30 bg-white/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md">
                  <span className="text-sm font-semibold text-[#18362d]">
                    Job categories
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {departments.length > 0
                      ? departments.map((department) => (
                          <button
                            key={department}
                            type="button"
                            onClick={() =>
                              setFilters({
                                ...filters,
                                department:
                                  filters.department === department
                                    ? ""
                                    : department,
                              })
                            }
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                              filters.department === department
                                ? "border-[#a8d38d] bg-[#a8d38d] text-[#0b5d3d]"
                                : "border-white/40 bg-white/35 text-[#18362d] hover:border-white/60 hover:bg-white/45"
                            }`}
                          >
                            {department}
                          </button>
                        ))
                      : ["IT", "Marketing", "Design", "Finance"].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/40 bg-white/35 px-2.5 py-1 text-[11px] font-medium text-[#18362d]"
                          >
                            {item}
                          </span>
                        ))}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#a8d38d] px-4 py-3 text-sm font-bold text-[#0b5d3d] shadow-sm transition hover:brightness-95"
                  >
                    Apply Filters
                  </button>
                </div>
              </form>
            </motion.aside>

            <motion.section variants={browseItem} className="min-w-0">
              {loading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} className="h-40" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-[26px] border border-[#dfe5df] bg-white/80 p-10 text-center shadow-sm">
                  <p className="mb-4 text-[#0F1E35]/70">{error}</p>
                  <button
                    type="button"
                    onClick={() => fetchJobs(filters)}
                    className="rounded-full bg-[#a8d38d] px-5 py-2.5 text-sm font-bold text-[#0b5d3d]"
                  >
                    Retry
                  </button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-[26px] border border-[#dfe5df] bg-white/80 p-10 text-center text-[#0F1E35]/70 shadow-sm">
                  No openings match your filters.
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={browseStagger}
                  className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:auto-rows-fr"
                >
                  {jobs.map((job) => (
                    <motion.div
                      key={job._id}
                      variants={browseItem}
                      whileHover={
                        prefersReducedMotion
                          ? undefined
                          : { y: -5, scale: 1.015 }
                      }
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      className="flex h-full min-w-0"
                    >
                      <JobCard job={job} onSelect={setSelectedJob} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.section>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BrowseJobs;
