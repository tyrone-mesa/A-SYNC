import React, { useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import { downloadExport } from "../../utils/download";

const ArchiveUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(null);
  const [downloadingUserId, setDownloadingUserId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
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
      const { data } = await api.get("/staff/admin/archive", {
        headers: { "X-Admin-Sensitive-Pin": activePin },
      });
      setUsers(data.users || []);
    } catch (err) {
      if (err.response?.status === 403) {
        // PIN cleared from React state on error (never persisted to storage)
        setPinLocked(true);
        setSessionPin("");
        setPinError("Access denied. The archive PIN is invalid.");
      } else {
        setPinError(
          err.response?.data?.message || "Unable to load archived users.",
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

  const restore = async (id) => {
    setBusy(id);
    try {
      await api.put(
        `/staff/admin/archive/${id}/restore`,
        {},
        { headers: { "X-Admin-Sensitive-Pin": sessionPin } },
      );
      load(sessionPin);
    } catch (err) {
      if (err.response?.status === 403) {
        setPinLocked(true);
        setSessionPin("");
        setPinError("Session expired or invalid PIN. Please re-enter PIN.");
      }
    } finally {
      setBusy(null);
    }
  };
  const filteredUsers = users.filter((user) =>
    [user.fullName, user.email, user.role]
      .filter(Boolean)
      .some((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  const viewUser = async (user) => {
    setLoadingDetails(user._id);
    try {
      const { data } = await api.get(`/staff/admin/archive/${user._id}`, {
        headers: { "X-Admin-Sensitive-Pin": sessionPin },
      });
      setSelectedUser(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setPinLocked(true);
        setSessionPin("");
        setPinError("Session expired or invalid PIN. Please re-enter PIN.");
      }
    } finally {
      setLoadingDetails(null);
    }
  };
  const downloadUserArchive = async (user) => {
    setDownloadingUserId(user._id);
    setDownloadError("");
    try {
      await downloadExport(
        `/staff/admin/archive/${user._id}/export`,
        `${user.fullName.replace(/[^a-z0-9]+/gi, "_")}_archive.pdf`,
        { headers: { "X-Admin-Sensitive-Pin": sessionPin } },
      );
    } catch (err) {
      setDownloadError(
        err.response?.data?.message || "Unable to download this archive.",
      );
    } finally {
      setDownloadingUserId(null);
    }
  };
  if (loading) return <DashboardLoading role="admin" />;

  if (pinLocked) {
    return (
      <DashboardShell
        role="admin"
        title="Archived Users"
        subtitle="Restricted admin archive access."
      >
        <div className="mx-auto max-w-md rounded-2xl border border-[#dfeae5] bg-white/70 p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-navy">Enter Your PIN</h2>
          <p className="mb-4 text-sm text-navy/70">
            Enter your PIN to access archived users.
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
            placeholder="Enter PIN"
            className="input-field mb-3"
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
      title="Archived Users"
      subtitle="Archived accounts remain available to the admin office and are not removed from the database."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          aria-label="Search archived users"
          placeholder="Search by name, email, or role"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={`input-field sm:max-w-md ${
            /^\d+$/.test(search.trim()) ? "numeric-value" : ""
          }`}
        />
        <button
          className="btn-secondary px-4 py-2 text-sm"
          onClick={() =>
            downloadExport(
              "/staff/admin/archive/export",
              "asiatech-archived-users.pdf",
              { headers: { "X-Admin-Sensitive-Pin": sessionPin } },
            )
          }
        >
          Download archive
        </button>
      </div>
      {downloadError && (
        <p role="alert" className="mb-4 text-sm text-[#DF2E1B]">
          {downloadError}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-[#f8faf8]">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-navy/65">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Archived</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id} className="border-b border-black/5">
                <td className="p-4 font-semibold">{user.fullName}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4 capitalize">{user.role}</td>
                <td className="p-4">
                  {user.archivedAt
                    ? new Date(user.archivedAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      className="btn-secondary px-3 py-2 text-xs"
                      disabled={loadingDetails === user._id}
                      onClick={() => viewUser(user)}
                    >
                      {loadingDetails === user._id ? "Loading..." : "View"}
                    </button>
                    <button
                      className="btn-secondary px-3 py-2 text-xs"
                      disabled={downloadingUserId === user._id}
                      onClick={() => downloadUserArchive(user)}
                    >
                      {downloadingUserId === user._id
                        ? "Downloading..."
                        : "Download PDF"}
                    </button>
                    <button
                      className="btn-secondary px-3 py-2 text-xs"
                      disabled={busy === user._id}
                      onClick={() => restore(user._id)}
                    >
                      {busy === user._id ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <p className="p-8 text-center text-navy/65">
            {users.length === 0
              ? "No archived accounts."
              : "No archived users match your search."}
          </p>
        )}
      </div>
      {selectedUser && (
        <div className="mt-5 rounded-2xl border border-black/5 bg-[#f8faf8] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-navy">
              {selectedUser.user.fullName}&apos;s archived data
            </h2>
            <button
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => setSelectedUser(null)}
            >
              Close
            </button>
          </div>
          <p className="mt-2 text-sm text-navy/70">
            {selectedUser.user.email} · {selectedUser.user.role}
          </p>
          {selectedUser.studentProfile && (
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <strong>Course:</strong>{" "}
                {selectedUser.studentProfile.course || "-"}
              </p>
              <p>
                <strong>Company:</strong>{" "}
                {selectedUser.studentProfile.companyPlacement || "-"}
              </p>
              <p>
                <strong>OJT hours:</strong>{" "}
                {selectedUser.studentProfile.completedOJTHours || 0} /{" "}
                {selectedUser.studentProfile.requiredOJTHours || 0}
              </p>
              <p>
                <strong>Applications:</strong>{" "}
                {selectedUser.applications.length}
              </p>
              <p>
                <strong>Attendance records:</strong>{" "}
                {selectedUser.attendance.length}
              </p>
            </div>
          )}
          {selectedUser.companyProfile && (
            <div className="mt-4 text-sm">
              <p>
                <strong>Company:</strong>{" "}
                {selectedUser.companyProfile.companyName}
              </p>
              <p>
                <strong>Job postings:</strong> {selectedUser.jobs.length}
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-navy/65">
            The Download action exports the complete retained account data,
            including linked profiles and records.
          </p>
        </div>
      )}
    </DashboardShell>
  );
};
export default ArchiveUsers;
