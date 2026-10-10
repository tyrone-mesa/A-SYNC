import React, { useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { downloadExport } from "../../utils/download";

const SecurityAudit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pinLocked, setPinLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [sessionPin, setSessionPin] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const verifySensitiveAccess = async (providedPin) => {
    try {
      await api.post("/staff/admin/sensitive-access/verify", {
        pin: providedPin,
      });
      // PIN is kept in React state only (not persisted) to reduce XSS exposure
      setPinLocked(false);
      setPinError("");
      return true;
    } catch (err) {
      setPinLocked(true);
      setSessionPin("");
      setPinError(err.response?.data?.message || "Invalid admin PIN.");
      return false;
    }
  };

  const load = async (activePin = sessionPin) => {
    try {
      const { data } = await api.get("/staff/admin/security-audit", {
        headers: { "X-Admin-Sensitive-Pin": activePin },
      });
      setLogs(data.logs || []);
    } catch (err) {
      if (err.response?.status === 403) {
        // PIN cleared from React state on error (never persisted to storage)
        setPinLocked(true);
        setSessionPin("");
        setPinError("Access denied. The security audit PIN is invalid.");
      } else {
        setPinError(
          err.response?.data?.message || "Unable to load security audit logs.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    const value = pin.trim();
    if (!value) {
      setPinError("Enter your PIN to continue.");
      return;
    }

    setVerifyingPin(true);
    const verified = await verifySensitiveAccess(value);
    setVerifyingPin(false);
    if (verified) {
      setSessionPin(value);
      setPin("");
      setLoading(true);
      await load(value);
    }
  };

  if (loading) return <DashboardLoading role="admin" />;

  if (pinLocked) {
    return (
      <DashboardShell
        role="admin"
        title="Security Audit Logs"
        subtitle="Restricted admin security access."
      >
        <div className="mx-auto max-w-md rounded-2xl border border-[#dfeae5] bg-white/70 p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-navy">Enter Your PIN</h2>
          <p className="mb-4 text-sm text-navy/70">
            Enter your PIN to access security audit logs.
          </p>
          <input
            autoFocus
            type="password"
            inputMode="text"
            maxLength={32}
            value={pin}
            onChange={(event) => setPin(event.target.value.trim())}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleUnlock();
            }}
            aria-label="Admin PIN"
            className="input-field mb-3"
            placeholder="Enter PIN"
          />
          <button
            type="button"
            className="btn-primary w-full"
            onClick={handleUnlock}
            disabled={verifyingPin}
          >
            {verifyingPin ? "Checking..." : "Continue"}
          </button>
          {pinError && (
            <p className="mt-3 text-sm text-[#DF2E1B]">{pinError}</p>
          )}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="admin"
      title="Security Audit Logs"
      subtitle="Review authentication, lockout, password reset, and file scanning events."
      actions={
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm"
          onClick={() =>
            downloadExport(
              "/staff/admin/security-audit/export",
              "asiatech-security-audit.xlsx",
              { headers: { "X-Admin-Sensitive-Pin": sessionPin } },
            )
          }
        >
          Download XLSX
        </button>
      }
    >
      <div className="space-y-3 md:hidden">
        {logs.map((log) => (
          <article
            key={log._id}
            className="space-y-3 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words font-semibold capitalize text-navy">
                {log.action.replace(/_/g, " ")}
              </p>
              <span
                className={`shrink-0 inline-flex text-xs font-bold capitalize ${
                  log.outcome === "success"
                    ? "text-[#5E7867]"
                    : "bg-coral/15 text-[#DF2E1B]"
                }`}
              >
                {log.outcome}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-navy/65">Time</dt>
              <dd className="text-right text-navy/75">
                {new Date(log.createdAt).toLocaleString()}
              </dd>
              <dt className="font-medium text-navy/65">Account</dt>
              <dd className="min-w-0 text-right">
                {log.user ? (
                  <>
                    <span className="block break-words font-semibold text-navy">
                      {log.user.fullName}
                    </span>
                    <span className="block break-all text-xs text-navy/65">
                      {log.user.email}
                    </span>
                    <span className="block text-xs capitalize text-navy/65">
                      {log.user.role}
                    </span>
                  </>
                ) : (
                  <span className="break-all text-navy/75">
                    {log.email || "Unknown"}
                  </span>
                )}
              </dd>
              <dt className="font-medium text-navy/65">Details</dt>
              <dd className="whitespace-pre-wrap break-words text-right text-navy/75">
                {log.details || "-"}
              </dd>
            </dl>
          </article>
        ))}
        {logs.length === 0 && (
          <p className="rounded-2xl border border-white/35 bg-white/60 p-6 text-center text-sm text-navy/65">
            No security events found.
          </p>
        )}
      </div>
      <div className="hidden min-h-full flex-col md:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/35 bg-white/45 shadow-sm backdrop-blur-md">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-white/40 bg-[#eaf4ed]/95 text-xs uppercase tracking-wide text-navy/65 backdrop-blur-md">
                <tr>
                  <th className="w-[150px] p-4">Time</th>
                  <th className="w-[150px] p-4">Action</th>
                  <th className="w-[130px] p-4">Result</th>
                  <th className="w-[240px] p-4">Account</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-white/40 last:border-0 hover:bg-white/35"
                  >
                    <td className="whitespace-nowrap p-4 align-top text-navy/75">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 align-top font-semibold capitalize text-navy">
                      {log.action.replace(/_/g, " ")}
                    </td>
                    <td className="p-4 align-top">
                      <span
                        className={`inline-flex text-xs font-bold capitalize ${
                          log.outcome === "success"
                            ? "text-[#5E7867]"
                            : "bg-coral/15 text-[#DF2E1B]"
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      {log.user ? (
                        <>
                          <span className="block font-semibold text-navy">
                            {log.user.fullName}
                          </span>
                          <span className="block break-all text-xs text-navy/65">
                            {log.user.email}
                          </span>
                          <span className="block text-xs capitalize text-navy/65">
                            {log.user.role}
                          </span>
                        </>
                      ) : (
                        <span className="text-navy/75">
                          {log.email || "Unknown"}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[520px] whitespace-pre-wrap p-4 align-top text-navy/75">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="p-10 text-center text-navy/65">
                No security events recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};
export default SecurityAudit;
