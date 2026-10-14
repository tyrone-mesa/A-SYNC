import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardLoading from "../../components/DashboardLoading";
import DashboardShell from "../../components/DashboardShell";

const CRITERIA = [
  ["workQuality", "Quality of Work"],
  ["productivity", "Productivity"],
  ["communication", "Communication"],
  ["punctuality", "Punctuality & Attendance"],
  ["teamwork", "Teamwork"],
  ["initiative", "Initiative"],
];

const RECOMMENDATION_LABELS = {
  highly_recommend: "Highly Recommend",
  recommend: "Recommend",
  recommend_with_reservations: "Recommend with Reservations",
  do_not_recommend: "Do Not Recommend",
};

// Batch 5: student view of their company OJT evaluations.
const MyEvaluation = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/evaluations/mine")
      .then(({ data }) => setEvaluations(data.evaluations || []))
      .catch(() => setError("Failed to load your evaluations."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLoading role="student" />;

  const finals = evaluations.filter((e) => e.status === "final");
  const drafts = evaluations.filter((e) => e.status === "draft");

  return (
    <DashboardShell
      role="student"
      title="My OJT Evaluation"
      subtitle="Evaluations submitted by your host company."
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-[#DF2E1B]">
            {error}
          </div>
        )}

        {finals.length === 0 ? (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 text-sm text-navy/60 shadow-sm">
            No evaluation submitted yet — your host company will evaluate you
            near the end of your OJT.
          </div>
        ) : (
          finals.map((evaluation) => (
            <div
              key={evaluation._id}
              className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-[#0b5d3d]">
                  {evaluation.company?.companyName || "Host Company"}
                </h3>
                <span className="text-sm font-bold text-[#5E7867]">
                  Final ·{" "}
                  {evaluation.submittedAt
                    ? new Date(evaluation.submittedAt).toLocaleDateString()
                    : ""}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {CRITERIA.map(([key, label]) => {
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

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-semibold text-navy">Recommendation:</span>{" "}
                  <span className="text-[#5E7867]">
                    {RECOMMENDATION_LABELS[evaluation.recommendation]}
                  </span>
                </p>
                {evaluation.strengths && (
                  <p className="text-navy/75">
                    <span className="font-semibold">Strengths:</span>{" "}
                    {evaluation.strengths}
                  </p>
                )}
                {evaluation.improvements && (
                  <p className="text-navy/75">
                    <span className="font-semibold">Areas to improve:</span>{" "}
                    {evaluation.improvements}
                  </p>
                )}
                {evaluation.overallComments && (
                  <p className="italic text-navy/60">
                    {evaluation.overallComments}
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        {drafts.length > 0 && (
          <p className="text-xs text-navy/55">
            {drafts.length} evaluation draft
            {drafts.length > 1 ? "s" : ""} in progress by your company.
          </p>
        )}
      </div>
    </DashboardShell>
  );
};

export default MyEvaluation;
