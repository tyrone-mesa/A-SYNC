import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import Loader from "../../components/Loader";

const emptyForm = { fullName: "", email: "", password: "" };

// Admin-only page for registering coordinator accounts. Coordinators never self-register and
// only ever get read-only access to the student roster — this page is where that access
// starts and ends.
const ManageCoordinators = () => {
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCoordinator, setSelectedCoordinator] = useState(null);
  const [editingCoordinator, setEditingCoordinator] = useState(null);
  const [editMessage, setEditMessage] = useState("");

  const filteredCoordinators = coordinators.filter((coordinator) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [coordinator.fullName, coordinator.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const load = () => {
    setLoading(true);
    api
      .get("/admin/coordinators")
      .then(({ data }) => setCoordinators(data.coordinators))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const { data } = await api.post("/admin/coordinators", form);
      setCreatedAccount({
        email: data.user.email,
        tempPassword: data.tempPassword,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create coordinator account.",
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id) => {
    await api.put(`/admin/users/${id}/toggle-active`);
    load();
  };

  const resetPassword = async (id) => {
    try {
      const { data } = await api.post(
        `/admin/coordinators/${id}/reset-password`,
      );
      setCreatedAccount({
        email: coordinators.find((coordinator) => coordinator._id === id)
          ?.email,
        tempPassword: data.tempPassword,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to reset coordinator password.",
      );
    }
  };

  const saveCoordinator = async (event) => {
    event.preventDefault();
    const { data } = await api.put(
      `/admin/users/${editingCoordinator._id}`,
      editingCoordinator,
    );
    setCoordinators((items) =>
      items.map((item) => (item._id === data.user._id ? data.user : item)),
    );
    setEditingCoordinator(null);
    setEditMessage("Coordinator profile updated.");
  };

  return (
    <DashboardShell
      title="Manage Coordinators"
      subtitle="Coordinators can only view the student roster — no editing, deleting, or company access."
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
          <div></div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={`w-full rounded-full px-4 py-2 text-sm font-medium shadow-sm transition sm:w-auto sm:shrink-0 ${
              showForm
                ? "bg-[#dfeecf] text-[#5E7867] border border-forest/20"
                : "bg-[#dfeecf] text-[#5E7867] border border-forest/20 hover:brightness-95"
            }`}
          >
            {showForm ? "Cancel" : "+ Add Coordinator"}
          </button>
        </div>

        {createdAccount && (
          <div className="mb-6 rounded-lg border border-forest/20 bg-[#dfeecf] px-4 py-4 text-sm text-[#5E7867]">
            <p className="mb-1 font-semibold">Coordinator account created.</p>
            <p>
              Share this password with{" "}
              <span className="font-medium">{createdAccount.email}</span> — it
              will not be shown again:{" "}
              <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-navy">
                {createdAccount.tempPassword}
              </span>
            </p>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="card p-6 space-y-5 mb-8">
            {error && (
              <div className="rounded-lg bg-coral/15 border border-coral/40 text-[#DF2E1B] text-sm px-4 py-3">
                {error}
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="managecoordinators-fullname">
                  Full Name
                </label>
                <input
                  id="managecoordinators-fullname"
                  name="fullName"
                  required
                  className="input-field"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label" htmlFor="managecoordinators-email">
                  Email Address
                </label>
                <input
                  id="managecoordinators-email"
                  type="email"
                  name="email"
                  required
                  className="input-field"
                  placeholder="coordinator@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label" htmlFor="managecoordinators-password">
                  Password
                </label>
                <input
                  id="managecoordinators-password"
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full sm:w-auto"
            >
              {creating ? "Creating…" : "Create Coordinator Account"}
            </button>
          </form>
        )}

        <div className="mb-5 rounded-2xl border border-white/30 bg-white/25 p-3 backdrop-blur-md">
          <input
            type="search"
            placeholder="Search coordinators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`input-field bg-white/60 py-2.5 ${
              /^\d+$/.test(search.trim()) ? "numeric-value" : ""
            }`}
            aria-label="Search coordinators"
          />
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="card divide-y divide-black/10">
            {filteredCoordinators.length === 0 && (
              <div className="p-8 text-center text-navy/65">
                {coordinators.length === 0
                  ? "No coordinator accounts yet."
                  : "No coordinators match your search."}
              </div>
            )}
            {filteredCoordinators.map((c) => (
              <React.Fragment key={c._id}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-navy font-medium">{c.fullName}</p>
                    <p className="break-all text-navy/65 text-sm">{c.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <span
                      className={`badge ${c.isActive ? "bg-gold/15 text-[#457D53]" : "bg-coral/15 text-[#DF2E1B]"}`}
                    >
                      {c.isActive ? "Active" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCoordinator(
                          selectedCoordinator?._id === c._id ? null : c,
                        )
                      }
                      className="text-navy/70 text-xs font-medium hover:underline"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingCoordinator({
                          _id: c._id,
                          fullName: c.fullName,
                          email: c.email,
                          password: "",
                        })
                      }
                      className="text-[#5E7867] text-xs font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPassword(c._id)}
                      className="text-navy/70 text-xs font-medium hover:underline"
                    >
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(c._id)}
                      className="text-navy/70 text-xs font-medium hover:underline"
                    >
                      {c.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
                {selectedCoordinator?._id === c._id && (
                  <div className="rounded-lg bg-navy/5 px-4 pb-4 text-xs text-navy/70">
                    Email: {c.email}
                    <br />
                    Created:{" "}
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}
                    <br />
                    Last login:{" "}
                    {c.lastLoginAt
                      ? new Date(c.lastLoginAt).toLocaleString()
                      : "Never"}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        {editMessage && (
          <div className="mt-5 rounded-2xl bg-[#dfeecf] p-4 text-sm text-[#5E7867]">
            {editMessage}
          </div>
        )}
        {editingCoordinator && (
          <form
            onSubmit={saveCoordinator}
            className="mt-5 grid gap-4 rounded-2xl border border-black/5 bg-[#f8faf8] p-5 sm:grid-cols-3"
          >
            <input
              className="input-field"
              required
              value={editingCoordinator.fullName}
              onChange={(event) =>
                setEditingCoordinator({
                  ...editingCoordinator,
                  fullName: event.target.value,
                })
              }
            />
            <input
              className="input-field"
              required
              type="email"
              value={editingCoordinator.email}
              onChange={(event) =>
                setEditingCoordinator({
                  ...editingCoordinator,
                  email: event.target.value,
                })
              }
            />
            <input
              className="input-field"
              type="password"
              minLength={6}
              placeholder="New password (optional)"
              value={editingCoordinator.password}
              onChange={(event) =>
                setEditingCoordinator({
                  ...editingCoordinator,
                  password: event.target.value,
                })
              }
            />
            <div className="flex gap-2">
              <button className="btn-primary px-4 py-2">Save</button>
              <button
                type="button"
                className="btn-secondary px-4 py-2"
                onClick={() => setEditingCoordinator(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
};

export default ManageCoordinators;
