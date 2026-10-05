import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { resolveFileUrl } from "../../utils/fileUrl";

const RegistrarStudentDetail = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [certificateOpen, setCertificateOpen] = useState(false);
  useEffect(() => {
    api
      .get(`/staff/registrar/students/${id}`)
      .then(({ data }) => setProfile(data.profile))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!certificateOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setCertificateOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [certificateOpen]);

  if (loading || !profile) return <DashboardLoading role="registrar" />;
  const complete =
    (profile.completedOJTHours || 0) >= (profile.requiredOJTHours || 0);
  const certificateUrl = resolveFileUrl(profile.certificateUrl);
  const certificateFile =
    profile.certificateOriginalName || certificateUrl;
  const certificateIsImage = /\.(jpe?g|png)(?:[?#].*)?$/i.test(
    certificateFile,
  );
  return (
    <>
      <DashboardShell
        role="registrar"
        title={profile.user?.fullName || "Student"}
        subtitle={profile.user?.email}
      >
        <Link
          to="/registrar/students"
          className="btn-secondary inline-block mb-6 px-4 py-2 text-sm"
        >
          Back to records
        </Link>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl bg-[#f8faf8] p-6">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">
              Student profile
            </h2>
            <p>
              <strong>Course:</strong> {profile.course || "Not specified"}
            </p>
            <p>
              <strong>Year level:</strong> {profile.yearLevel || "Not specified"}
            </p>
            <p>
              <strong>Department:</strong> {profile.department || "Not specified"}
            </p>
            <p>
              <strong>OJT company:</strong>{" "}
              {profile.companyPlacement || "Not assigned"}
            </p>
            <p>
              <strong>Hours:</strong> {profile.completedOJTHours || 0} /{" "}
              {profile.requiredOJTHours || 0}
            </p>
          </section>
          <section className="rounded-2xl bg-[#f8faf8] p-6">
            <h2 className="font-display text-xl font-semibold text-navy mb-4">
              Completion record
            </h2>
            {complete && profile.assessmentSubmittedAt ? (
              <>
                <p>
                  <strong>Grade:</strong> {profile.performanceGrade}
                </p>
                <p className="mt-3">
                  <strong>Evaluation:</strong> {profile.evaluation}
                </p>
                {certificateUrl && (
                  <button
                    type="button"
                    className="btn-primary mt-5 px-4 py-2 text-sm"
                    onClick={() => setCertificateOpen(true)}
                  >
                    View certificate
                  </button>
                )}
              </>
            ) : (
              <p className="text-navy/65">
                The certificate and assessment become available after the
                required OJT hours are completed.
              </p>
            )}
          </section>
        </div>
      </DashboardShell>
      {createPortal(
        <AnimatePresence>
          {certificateOpen && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102f25]/65 p-3 backdrop-blur-sm sm:p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget)
                  setCertificateOpen(false);
              }}
            >
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="registrar-certificate-title"
                className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f8faf6] shadow-2xl"
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              >
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-white px-4 py-3 sm:px-6">
                  <h2
                    id="registrar-certificate-title"
                    className="min-w-0 truncate font-display text-lg font-semibold text-navy"
                  >
                    {profile.certificateOriginalName || "Student certificate"}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={certificateUrl}
                      download={profile.certificateOriginalName || true}
                      className="rounded-lg bg-[#eaf3ee] px-3 py-2 text-sm font-medium text-[#173d34] transition hover:bg-[#dfeecf]"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => setCertificateOpen(false)}
                      aria-label="Close certificate preview"
                      className="rounded-full p-2 text-xl leading-none text-navy/70 transition hover:bg-navy/5 hover:text-navy"
                    >
                      ×
                    </button>
                  </div>
                </header>
                <div className="flex min-h-0 flex-1 items-center justify-center bg-[#e7ece8] p-2 sm:p-4">
                  {certificateIsImage ? (
                    <img
                      src={certificateUrl}
                      alt={`Certificate for ${profile.user?.fullName || "student"}`}
                      className="max-h-full max-w-full rounded-lg object-contain shadow-md"
                    />
                  ) : /\.pdf(?:[?#].*)?$/i.test(certificateFile) ? (
                    <iframe
                      title={`Certificate for ${profile.user?.fullName || "student"}`}
                      src={certificateUrl}
                      className="h-full w-full rounded-lg border-0 bg-white shadow-md"
                    />
                  ) : (
                    <p className="max-w-md text-center text-sm text-navy/70">
                      Preview isn’t available for this file type. Use Download
                      to view the certificate.
                    </p>
                  )}
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
export default RegistrarStudentDetail;
