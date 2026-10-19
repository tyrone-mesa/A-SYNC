import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import DashboardLoading from "../../components/DashboardLoading";
import DashboardShell from "../../components/DashboardShell";

const emptyForm = { fullName: "", email: "", password: "", adminType: "full" };

// Admin account management — visible to full admins only (nav item is hidden
// for read-only admins and every mutation below is enforced server-side).
const ManageAdmins = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/admin/admins")
      .then(({ data }) => setAdmins(data.admins || []))
      .catch(() => setError("Failed to load admin accounts."));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const startEdit = (admin) => {
    setEditingId(admin.id);
    setForm({
      fullName: admin.fullName,
      email: admin.email,
      password: "",
      adminType: admin.adminType || "full",
    });
    setNotice("");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await api.put(`/admin/admins/${editingId}`, form);
      setNotice("Admin account updated.");
      cancelEdit();
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update admin account.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async (admin) => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const { data } = await api.put(`/admin/admins/${admin.id}/archive`);
      setNotice(data.message || "Admin account updated.");
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update admin account.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLoading role="admin" />;

  return (
    <DashboardShell
      role="admin"
      title="Admin Accounts"
      subtitle="Create, edit, and archive full and read-only admin accounts."
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

        <div className="row-shell rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
          <div className="row-list divide-y divide-black/10">
            {admins.map((admin) => (
              <div key={admin.id} className="row-item py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="row-title font-medium text-navy">{admin.fullName}</p>
                    <p className="row-sub text-sm text-navy/65">
                      {admin.email} ·{" "}
                      {admin.adminType === "read-only"
                        ? "Read-only admin"
                        : "Full admin"}
                      {!admin.isActive && " · Archived"}
                    </p>
                  </div>
                  <div className="row-actions flex flex-wrap items-center gap-3 text-sm shrink-0">
                    <span
                      className={`row-status text-sm font-bold ${
                        admin.adminType === "read-only"
                          ? "text-[#5E7867]"
                          : "text-navy"
                      }`}
                    >
                      {admin.adminType === "read-only"
                        ? "Read-only"
                        : "Full admin"}
                    </span>
                    <span
                      className={`row-status text-sm font-bold ${
                        admin.isActive
                          ? "text-[#5E7867]"
                          : "text-navy/50"
                      }`}
                    >
                      {admin.isActive ? "Active" : "Archived"}
                    </span>
                    {
                      (admin.id !== currentUser?.id ||
                        admin.adminType === "read-only") && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(admin)}
                          className="row-action text-[#2F6FE4] hover:underline"
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleArchive(admin)}
                          className={
                            admin.isActive
                              ? "row-action text-[#DF2E1B] hover:underline"
                              : "row-action text-[#5E7867] hover:underline"
                          }
                          disabled={busy}
                        >
                          {admin.isActive ? "Archive" : "Restore"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === admin.id && (
                  <form
                    onSubmit={handleSave}
                    className="mt-4 grid gap-3 rounded-2xl border border-black/5 bg-white/70 p-4 sm:grid-cols-2"
                  >
                    <div>
                      <label
                        className="label"
                        htmlFor={`admin-name-${admin.id}`}
                      >
                        Full name
                      </label>
                      <input
                        id={`admin-name-${admin.id}`}
                        name="fullName"
                        className="input"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label
                        className="label"
                        htmlFor={`admin-email-${admin.id}`}
                      >
                        Email
                      </label>
                      <input
                        id={`admin-email-${admin.id}`}
                        name="email"
                        type="email"
                        className="input"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label
                        className="label"
                        htmlFor={`admin-password-${admin.id}`}
                      >
                        New password
                      </label>
                      <input
                        id={`admin-password-${admin.id}`}
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        className="input"
                        placeholder="Leave blank to keep current password"
                        value={form.password}
                        onChange={handleChange}
                        minLength={8}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-navy">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="adminType"
                          value="full"
                          checked={form.adminType === "full"}
                          onChange={handleChange}
                        />
                        Full admin
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="adminType"
                          value="read-only"
                          checked={form.adminType === "read-only"}
                          onChange={handleChange}
                        />
                        Read-only admin
                      </label>
                    </div>
                    <div className="flex gap-2 sm:col-span-2">
                      <button className="btn-primary" disabled={busy}>
                        {busy ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={cancelEdit}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-navy/60">
          Read-only admins can view all dashboards and use messages, but cannot
          add, edit, or delete accounts. Changes they attempt are blocked by
          the server, not just the interface.
        </p>
      </div>
    </DashboardShell>
  );
};

export default ManageAdmins;
