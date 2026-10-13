import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import ListRowSkeleton from "../../components/ListRowSkeleton";
import { useAuth } from "../../context/AuthContext";

const renderNumericEmail = (email) =>
  email.split(/(\d+)/).map((part, index) =>
    /\d+/.test(part) ? (
      <span className="numeric-value" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ),
  );

const getLoadErrorMessage = (error) =>
  error.response?.status === 429
    ? "The API request limit was reached. Wait briefly, then try again."
    : error.response?.data?.message || "Unable to load users. Please try again.";

const ManageUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingUserId, setProcessingUserId] = useState(null);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [user.fullName, user.email, user.role]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    api
      .get("/admin/users", {
        params: roleFilter ? { role: roleFilter } : {},
        signal: controller.signal,
      })
      .then(({ data }) => setUsers(data.users))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(getLoadErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [roleFilter, reloadCount]);

  const toggleActive = async (id) => {
    setProcessingUserId(id);
    setActionMessage("");
    setActionError("");
    try {
      const { data } = await api.put(`/admin/users/${id}/toggle-active`);
      setUsers((items) =>
        items.map((item) => (item._id === data.user._id ? data.user : item)),
      );
      setActionMessage(
        `${data.user.fullName} is now ${data.user.isActive ? "active" : "disabled"}.`,
      );
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Unable to update this account.",
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  const archiveUser = async (user) => {
    if (
      !window.confirm(
        `Archive ${user.fullName}'s account? Their database records will remain recoverable from Archive.`,
      )
    ) {
      return;
    }

    setProcessingUserId(user._id);
    setActionMessage("");
    setActionError("");
    try {
      await api.delete(`/admin/users/${user._id}/archive`);
      setUsers((items) => items.filter((item) => item._id !== user._id));
      setActionMessage(`${user.fullName} was archived successfully.`);
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Unable to archive this account.",
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  const [adminForm, setAdminForm] = useState({
    fullName: "",
    email: "",
    password: "",
    adminType: "full",
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const handleAdminFormChange = (e) =>
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      await api.post("/admin/admins", adminForm);
      setAdminForm({
        fullName: "",
        email: "",
        password: "",
        adminType: "full",
      });
      setAdminSuccess("Admin account created.");
    } catch (err) {
      setAdminError(
        err.response?.data?.message || "Failed to create admin account.",
      );
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <DashboardShell
      title="Manage Users"
      subtitle="Enable or disable accounts across all roles."
    >
      <div className="max-w-5xl mx-auto">
        {loadError && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-coral/10 p-4 text-sm text-[#DF2E1B]"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
              className="font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
        <div className="mb-5 rounded-2xl border border-white/30 bg-white/25 p-3 backdrop-blur-md">
          <input
            type="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`input-field bg-white/60 py-2.5 ${
              /^\d+$/.test(search.trim()) ? "numeric-value" : ""
            }`}
            aria-label="Search users"
          />
        </div>
        <div className="animate-filter-slide mb-6 flex flex-wrap gap-2">
          {["", "student", "company", "coordinator", "registrar", "admin"].map(
            (r) => (
              <button
                key={r || "all"}
                onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                  roleFilter === r
                    ? "bg-[#dfeecf] text-[#5E7867] border-forest/20"
                    : "bg-navy/5 text-navy/70 border-transparent hover:bg-navy/10"
                }`}
              >
                {r ? r.charAt(0).toUpperCase() + r.slice(1) + "s" : "All"}
              </button>
            ),
          )}
        </div>

        {loading ? (
          <div className="card p-4">
            <ListRowSkeleton rows={8} />
          </div>
        ) : (
          <div className="card divide-y divide-black/10">
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-navy/65">
                {users.length === 0
                  ? "No users found."
                  : "No users match your search."}
              </div>
            )}
            {filteredUsers.map((u) => (
              <div
                key={u._id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-navy font-medium">{u.fullName}</p>
                  <p className="break-all text-navy/65 text-sm">
                    {renderNumericEmail(u.email)} · {u.role}
                    {u.role === "admin" && u.adminType === "read-only" && (
                      <span className="text-sm font-bold text-[#5E7867]"> (Read-Only)</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <span
                    className={u.isActive ? "text-sm font-bold text-[#5E7867]" : "text-sm font-bold text-[#DF2E1B]"}
                  >
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                  {u.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => toggleActive(u._id)}
                      disabled={processingUserId === u._id}
                      className="text-navy/70 text-xs font-medium hover:underline"
                    >
                      {processingUserId === u._id
                        ? "Updating..."
                        : u.isActive
                          ? "Disable"
                          : "Enable"}
                    </button>
                  )}
                  {u._id !== currentUser?._id && !u.isArchived && (
                    <button
                      type="button"
                      onClick={() => archiveUser(u)}
                      disabled={processingUserId === u._id}
                      className="text-coral text-xs font-medium hover:underline"
                    >
                      {processingUserId === u._id ? "Archiving..." : "Archive"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {currentUser?.adminType !== "read-only" && (
          <div className="mt-6 rounded-2xl border border-black/5 bg-[#f8fbfa] p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-navy">
              Create admin account
            </h3>
            <p className="mt-1 text-sm text-navy/65">
              Full admins can manage everything. Read-only admins can view all
              dashboards and use messages, but cannot add, edit, or delete
              accounts.
            </p>
            <form
              onSubmit={handleCreateAdmin}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <input
                name="fullName"
                className="input-field"
                placeholder="Full name"
                value={adminForm.fullName}
                onChange={handleAdminFormChange}
                required
              />
              <input
                name="email"
                type="email"
                className="input-field"
                placeholder="Email"
                value={adminForm.email}
                onChange={handleAdminFormChange}
                required
              />
              <input
                name="password"
                type="password"
                className="input-field"
                placeholder="Password (min 8 characters)"
                value={adminForm.password}
                onChange={handleAdminFormChange}
                minLength={8}
                required
              />
              <div className="flex items-center gap-4 text-sm text-navy">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="adminType"
                    value="full"
                    checked={adminForm.adminType === "full"}
                    onChange={handleAdminFormChange}
                  />
                  Full admin
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="adminType"
                    value="read-only"
                    checked={adminForm.adminType === "read-only"}
                    onChange={handleAdminFormChange}
                  />
                  Read-only admin
                </label>
              </div>
              <button className="btn-primary sm:col-span-2" disabled={creatingAdmin}>
                {creatingAdmin ? "Creating…" : "Create admin account"}
              </button>
            </form>
            {adminError && (
              <p className="mt-2 text-xs text-[#DF2E1B]">{adminError}</p>
            )}
            {adminSuccess && (
              <p className="mt-2 text-xs text-green-700">{adminSuccess}</p>
            )}
          </div>
        )}

        {actionMessage && (
          <div className="mt-5 rounded-2xl bg-[#dfeecf] p-4 text-sm text-[#5E7867]">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div className="mt-5 rounded-2xl bg-coral/10 p-4 text-sm text-[#DF2E1B]">
            {actionError}
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default ManageUsers;
