import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/axios";
import Loader from "../../components/Loader";
import DashboardShell from "../../components/DashboardShell";
import { downloadBlob } from "../../utils/download";
import SelectDropdown from "../../components/SelectDropdown";

const InterviewSimulator = () => {
  const [sessions, setSessions] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [answers, setAnswers] = useState([]);

  const [form, setForm] = useState({ jobTitle: "", department: "" });
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = () => {
    setLoadingList(true);
    api
      .get("/interview/sessions")
      .then(({ data }) => setSessions(data.sessions))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadSessions();

    api
      .get("/jobs", { params: { limit: 1000 } })
      .then(({ data }) => setAvailableJobs(data.jobs || []))
      .catch(() => setAvailableJobs([]));
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "jobTitle") {
      const selectedJob = availableJobs.find((job) => job.title === value);
      setForm({
        ...form,
        jobTitle: value,
        department: selectedJob ? selectedJob.department : "",
      });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");
    setGenerating(true);
    try {
      const { data } = await api.post("/interview/sessions", form);
      setActiveSession(data.session);
      setAnswers(data.session.questions.map(() => ""));
      setForm({ jobTitle: "", department: "" });
      loadSessions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate interview questions.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const openSession = async (id) => {
    setError("");
    const { data } = await api.get(`/interview/sessions/${id}`);
    setActiveSession(data.session);
    setAnswers(data.session.questions.map((q) => q.answer || ""));
  };

  const handleAnswerChange = (i, value) => {
    const next = [...answers];
    next[i] = value;
    setAnswers(next);
  };

  const handleSubmitAnswers = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.put(
        `/interview/sessions/${activeSession._id}/answers`,
        { answers },
      );
      setActiveSession(data.session);
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to score your answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (id, jobTitle) => {
    const response = await api.get(`/interview/sessions/${id}/export`, {
      responseType: "blob",
    });
    downloadBlob(
      new Blob([response.data], { type: "application/pdf" }),
      `interview-${jobTitle.replace(/[^a-z0-9]+/gi, "-")}.pdf`,
    );
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Delete this interview session? This cannot be undone.")
    )
      return;
    await api.delete(`/interview/sessions/${id}`);
    if (activeSession?._id === id) setActiveSession(null);
    loadSessions();
  };

  return (
    <DashboardShell
      role="student"
      title="Interview Simulator"
      subtitle="Practice for a specific role — get tailored questions, answer them, and receive a score and feedback for each response."
    >
      <div className="w-full max-w-5xl">
        {error && (
          <div className="mb-4 rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-[#DF2E1B]">
            {error}
          </div>
        )}

        {!activeSession && (
          <form
            onSubmit={handleGenerate}
            className="mb-8 border-b border-[#dfe8e0] bg-white/30 p-4 space-y-4"
          >
            <h2 className="font-display text-2xl font-semibold text-[#1a2e2d]">
              Start a new practice session
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-[#1f2d3d]"
                  htmlFor="interview-jobtitle"
                >
                  Target Job Title
                </label>
                                <SelectDropdown
                  id="interview-jobtitle"
                  name="jobTitle"
                  required
                  allowEmpty
                  placeholder={
                    availableJobs.length > 0
                      ? "Select a current job opening"
                      : "No open jobs available right now"
                  }
                  className="input-field h-11 py-2 text-sm"
                  value={form.jobTitle}
                  onChange={handleFormChange}
                  disabled={availableJobs.length === 0}
                  options={[
                    ...new Set(availableJobs.map((job) => job.title)),
                  ].map((title) => ({ value: title, label: title }))}
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-[#1f2d3d]"
                  htmlFor="interview-department"
                >
                  Department / Field (optional)
                </label>
                <input
                  id="interview-department"
                  name="department"
                  placeholder="e.g. Computer Science"
                  className="input-field h-11 py-2 text-sm"
                  value={form.department}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={generating || availableJobs.length === 0}
              className="btn-primary h-10 px-4 text-sm disabled:cursor-not-allowed"
            >
              {generating
                ? "Generating questions…"
                : "Generate Interview Questions"}
            </button>
          </form>
        )}

        <AnimatePresence mode="wait">
          {activeSession && (
            <motion.div
              key={activeSession._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mb-8 border-b border-[#dfe8e0] bg-white/30 p-4"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#1a2e2d]">
                    {activeSession.jobTitle}
                  </h2>
                  {activeSession.department && (
                    <p className="text-sm text-[#314843]">
                      {activeSession.department}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeSession.status === "scored" && (
                    <span className="badge bg-[#dfeecf] text-[#5E7867] border border-forest/20">
                      {activeSession.totalScore} / {activeSession.maxScore}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSession(null)}
                    className="text-xs font-medium text-navy/65 hover:underline"
                  >
                    Close
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitAnswers} className="mt-4 space-y-4">
                {activeSession.questions.map((q, i) => (
                  <div key={i} className="border-t border-black/10 pt-3">
                    <p className="mb-2 font-medium text-navy">
                      Q{i + 1}. {q.question}
                    </p>
                    <textarea
                      rows={3}
                      required
                      disabled={activeSession.status === "scored"}
                      className="input-field min-h-24 resize-none disabled:opacity-80"
                      placeholder="Type your answer…"
                      value={answers[i] || ""}
                      onChange={(e) => handleAnswerChange(i, e.target.value)}
                    />
                    {activeSession.status === "scored" && (
                      <div className="mt-2 flex items-start gap-3">
                        <span className="badge shrink-0 border border-forest/20 bg-[#dfeecf] text-[#5E7867]">
                          {q.score} / 10
                        </span>
                        <p className="text-sm text-navy/65">{q.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}

                {activeSession.status !== "scored" && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting
                      ? "Scoring your answers…"
                      : "Submit for Scoring"}
                  </button>
                )}
              </form>

              {activeSession.status === "scored" && (
                <>
                  <div className="mt-6 border-t border-black/10 pt-4">
                    <h3 className="mb-2 font-display font-semibold text-navy">
                      Overall Feedback
                    </h3>
                    <p className="text-sm leading-relaxed text-navy/70">
                      {activeSession.overallFeedback}
                    </p>
                  </div>
                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleExport(activeSession._id, activeSession.jobTitle)
                      }
                      className="btn-secondary text-sm"
                    >
                      Export as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(activeSession._id)}
                      className="btn-danger text-sm"
                    >
                      Delete Session
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <h2 className="mb-4 font-display text-lg font-semibold text-navy">
          Past Sessions
        </h2>
        {loadingList ? (
          <Loader />
        ) : (
          <div className="border-t border-[#dfe8e0] bg-white/20 p-4">
            <div className="divide-y divide-[#dfe8e0]">
              {sessions.length === 0 && (
                <div className="p-8 text-center text-[#314843]">
                  No practice sessions yet — start one above.
                </div>
              )}
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => openSession(s._id)}
                    className="flex-1 text-left transition hover:opacity-80"
                  >
                    <p className="font-medium text-navy">{s.jobTitle}</p>
                    <p className="text-sm text-navy/65">
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        timeZone: "Asia/Manila",
                      })}{" "}
                      ·{" "}
                      {s.status === "scored"
                        ? `${s.totalScore} / ${s.maxScore}`
                        : "Not yet scored"}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    {s.status === "scored" && (
                      <button
                        onClick={() => handleExport(s._id, s.jobTitle)}
                        className="text-xs font-medium text-[#457D53] hover:underline"
                      >
                        Export
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-xs font-medium text-[#DF2E1B] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default InterviewSimulator;
