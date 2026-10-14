import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardLoading from "../../components/DashboardLoading";
import DashboardShell from "../../components/DashboardShell";
import SelectDropdown from "../../components/SelectDropdown";

const CRITERIA = [
  ["workQuality", "Quality of Work"],
  ["productivity", "Productivity"],
  ["communication", "Communication"],
  ["punctuality", "Punctuality & Attendance"],
  ["teamwork", "Teamwork"],
  ["initiative", "Initiative"],
];

const RECOMMENDATIONS = [
  { value: "highly_recommend", label: "Highly Recommend" },
  { value: "recommend", label: "Recommend" },
  { value: "recommend_with_reservations", label: "Recommend with Reservations" },
  { value: "do_not_recommend", label: "Do Not Recommend" },
];

const emptyForm = () => ({
  ratings: Object.fromEntries(CRITERIA.map(([k]) => [k, 3])),
  strengths: "",
  improvements: "",
  overallComments: "",
  recommendation: "recommend",
  status: "draft",
});

const average = (ratings) =>
  (Object.values(ratings).reduce((a, b) => a + Number(b), 0) /
    Object.values(ratings).length
  ).toFixed(1);

// Batch 5: company-side OJT evaluations of accepted trainees.
const StudentEvaluations = () => {
  const [trainees, setTrainees] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { studentId, evaluationId? }
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [t, e] = await Promise.all([
      api.get("/evaluations/trainees"),
      api.get("/evaluations/company"),
    ]);
    setTrainees(t.data.trainees || []);
    setEvaluations(e.data.evaluations || []);
  };

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load trainees."))
      .finally(() => setLoading(false));
  }, []);

  const evaluationFor = (studentId) =>
    evaluations.find((e) => e.student?._id === studentId);

  const startForm = (studentId) => {
    const existing = evaluationFor(studentId);
    setEditing({ studentId, evaluationId: existing?._id });
    setForm(
      existing
        ? {
            ratings: { ...existing.ratings },
            strengths: existing.strengths || "",
            improvements: existing.improvements || "",
            overallComments: existing.overallComments || "",
            recommendation: existing.recommendation,
            status: existing.status,
          }
        : emptyForm(),
    );
    setNotice("");
    setError("");
  };

  const cancelForm = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const save = async (status) => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const payload = { ...form, status, studentId: editing.studentId };
      if (editing.evaluationId) {
        await api.put(`/evaluations/${editing.evaluationId}`, payload);
      } else {
        await api.post("/evaluations", payload);
      }
      setNotice(
        status === "final"
          ? "Final evaluation submitted."
          : "Draft saved.",
      );
      cancelForm();
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save the evaluation.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLoading role="company" />;

  return (
    <DashboardShell
      role="company"
      title="Student Evaluations"
      subtitle="Evaluate your accepted OJT trainees. Only one final evaluation per trainee."
    >
      <div className="space-y-6">
        {notice && (
          <div className="rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 text-sm text-[#5E7867]">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-[#DF2E1B]">
            {error}
          </div>
        )}

        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
          {trainees.length === 0 ? (
            <p className="py-2 text-sm text-navy/60">
              No accepted trainees yet.
            </p>
          ) : (
            <div className="divide-y divide-black/10">
              {trainees.map((student) => {
                const evaluation = evaluationFor(student._id);
                const isFinal = evaluation?.status === "final";
                const isEditingThis =
                  editing?.studentId === student._id;
                return (
                  <div key={student._id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-navy">
                          {student.user?.fullName}
                        </p>
                        <p className="text-sm text-navy/65">
                          {student.user?.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {evaluation && (
                          <>
                            <span className="text-sm font-bold text-[#5E7867]">
                              Avg {average(evaluation.ratings)}/5
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                isFinal ? "text-[#5E7867]" : "text-navy/50"
                              }`}
                            >
                              {isFinal ? "Final" : "Draft"}
                            </span>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busy || (isFinal && !isEditingThis)}
                          onClick={() => startForm(student._id)}
                          className="font-medium text-[#2F6FE4] hover:underline disabled:opacity-40"
                        >
                          {isFinal ? "View" : evaluation ? "Edit" : "Evaluate"}
                        </button>
                      </div>
                    </div>

                    {isEditingThis && (
                      <div className="mt-3 rounded-2xl border border-black/5 bg-white/70 p-4">
                        {isFinal ? (
                          <div className="space-y-2 text-sm">
                            {CRITERIA.map(([key, label]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between"
                              >
                                <span className="text-navy/70">{label}</span>
                                <span className="numeric-value font-bold text-[#0b5d3d]">
                                  {evaluation.ratings[key]}/5
                                </span>
                              </div>
                            ))}
                            <p className="pt-1 text-sm text-navy/80">
                              <span className="font-semibold">Recommendation:</span>{" "}
                              {
                                RECOMMENDATIONS.find(
                                  (r) => r.value === evaluation.recommendation,
                                )?.label
                              }
                            </p>
                            {evaluation.overallComments && (
                              <p className="text-sm italic text-navy/60">
                                {evaluation.overallComments}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={cancelForm}
                              className="text-xs text-navy/60 hover:underline"
                            >
                              Close
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {CRITERIA.map(([key, label]) => (
                              <div key={key}>
                                <label className="mb-1 block text-xs text-navy/65">
                                  {label} (1–5)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={form.ratings[key]}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      ratings: {
                                        ...form.ratings,
                                        [key]: e.target.value,
                                      },
                                    })
                                  }
                                  className="input-field py-1.5 text-sm"
                                />
                              </div>
                            ))}
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs text-navy/65">
                                Recommendation
                              </label>
                              <SelectDropdown
                                name="recommendation"
                                value={form.recommendation}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    recommendation: e.target.value,
                                  })
                                }
                                options={RECOMMENDATIONS}
                                className="input-field py-1.5 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs text-navy/65">
                                Strengths
                              </label>
                              <textarea
                                rows={2}
                                value={form.strengths}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    strengths: e.target.value,
                                  })
                                }
                                className="input-field py-2 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs text-navy/65">
                                Areas for Improvement
                              </label>
                              <textarea
                                rows={2}
                                value={form.improvements}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    improvements: e.target.value,
                                  })
                                }
                                className="input-field py-2 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs text-navy/65">
                                Overall Comments
                              </label>
                              <textarea
                                rows={3}
                                value={form.overallComments}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    overallComments: e.target.value,
                                  })
                                }
                                className="input-field py-2 text-sm"
                              />
                            </div>
                            <div className="flex flex-wrap gap-3 sm:col-span-2">
                              <button
                                type="button"
                                className="btn-primary h-9 px-4"
                                disabled={busy}
                                onClick={() => save("final")}
                              >
                                {busy ? "Saving…" : "Submit Final"}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary h-9 px-4"
                                disabled={busy}
                                onClick={() => save("draft")}
                              >
                                Save Draft
                              </button>
                              <button
                                type="button"
                                onClick={cancelForm}
                                className="text-xs text-navy/60 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default StudentEvaluations;
