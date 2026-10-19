import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";

const emptyForm = { fullName: "", email: "", password: "" };

const ManageRegistrars = () => {
  const [registrars, setRegistrars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/admin/users", { params: { role: "registrar" } })
      .then(({ data }) => setRegistrars(data.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const { data } = await api.post("/admin/registrars", form);
      setCreated(data);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create registrar account.",
      );
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const { data } = await api.put(`/admin/registrars/${editing._id}`, editing);
    setRegistrars((items) =>
      items.map((item) =>
        item._id === data.registrar._id ? data.registrar : item,
      ),
    );
    setEditing(null);
    setMessage("Registrar details updated.");
  };

  const resetPassword = async (id) => {
    const { data } = await api.post(`/admin/registrars/${id}/reset-password`);
    setMessage(`Temporary password: ${data.tempPassword}`);
  };

  const archive = async (registrar) => {
    if (
      !window.confirm(
        `Archive ${registrar.fullName}'s account? It can still be restored from Archive.`,
      )
    )
      return;
    await api.delete(`/admin/registrars/${registrar._id}`);
    setRegistrars((items) =>
      items.filter((item) => item._id !== registrar._id),
    );
    setMessage("Registrar account archived.");
  };

  return (
    <DashboardShell
      role="admin"
      title="Manage Registrars"
      subtitle="Create and manage registrar accounts with access limited to student records and completed certificates."
    >
      <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div></div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setError("");
          }}
          className="w-full rounded-full border border-forest/20 bg-[#dfeecf] px-4 py-2 text-sm font-medium text-[#5E7867] shadow-sm transition hover:brightness-95 sm:w-auto sm:shrink-0"
        >
          {showForm ? "Cancel" : "+ Add Registrar"}
        </button>
      </div>

      {created && (
        <div className="mb-5 rounded-2xl bg-[#dfeecf] p-4 text-sm text-[#5E7867]">
          Account created for {created.user.email}. The password you entered is
          now active and securely stored.
        </div>
      )}
      {message && (
        <div className="mb-5 rounded-2xl bg-[#dfeecf] p-4 text-sm text-[#5E7867]">
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-8 space-y-5 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
              {error}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="create-registrar-name">
                Full Name
              </label>
              <input
                id="create-registrar-name"
                className="input-field"
                required
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="create-registrar-email">
                Email Address
              </label>
              <input
                id="create-registrar-email"
                className="input-field"
                required
                type="email"
                placeholder="registrar@example.com"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="create-registrar-password">
                Password
              </label>
              <input
                id="create-registrar-password"
                className="input-field"
                required
                type="password"
                minLength={6}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="btn-primary w-full sm:w-auto"
          >
            {creating ? "Creating…" : "Create Registrar Account"}
          </button>
        </form>
      )}

      {editing && (
        <form
          onSubmit={saveEdit}
          className="mb-5 grid gap-4 rounded-2xl border border-black/5 bg-[#f8faf8] p-5 sm:grid-cols-3"
        >
          <input
            className="input-field"
            required
            value={editing.fullName}
            onChange={(event) =>
              setEditing({ ...editing, fullName: event.target.value })
            }
          />
          <input
            className="input-field"
            required
            type="email"
            value={editing.email}
            onChange={(event) =>
              setEditing({ ...editing, email: event.target.value })
            }
          />
          <input
            className="input-field"
            type="password"
            minLength={6}
            placeholder="New password (optional)"
            value={editing.password}
            onChange={(event) =>
              setEditing({ ...editing, password: event.target.value })
            }
          />
          <div className="flex gap-2">
            <button className="btn-primary px-4 py-2">Save</button>
            <button
              type="button"
              className="btn-secondary px-4 py-2"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm">
            Loading...
          </div>
        ) : registrars.length === 0 ? (
          <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-8 text-center text-navy/65 shadow-sm">
            No registrar accounts yet.
          </div>
        ) : (
          registrars.map((registrar) => (
                <div
                  key={registrar._id}
                  className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong>{registrar.fullName}</strong>
                      <span className="ml-3 text-navy/65">
                        {registrar.email}
                      </span>
                    </div>
                    <span className="text-xs text-navy/65">
                      {registrar.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-navy/70 hover:underline"
                      onClick={() =>
                        setSelected(
                          selected?._id === registrar._id ? null : registrar,
                        )
                      }
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-navy/70 hover:underline"
                      onClick={() =>
                        setEditing({
                          _id: registrar._id,
                          fullName: registrar.fullName,
                          email: registrar.email,
                          password: "",
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-navy/70 hover:underline"
                      onClick={() => resetPassword(registrar._id)}
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-[#DF2E1B] hover:underline"
                      onClick={() => archive(registrar)}
                    >
                      Delete
                    </button>
                  </div>
                  {selected?._id === registrar._id && (
                    <div className="mt-3 rounded-lg bg-navy/5 p-3 text-xs text-navy/70">
                      Created:{" "}
                      {registrar.createdAt
                        ? new Date(registrar.createdAt).toLocaleString()
                        : "-"}
                      <br />
                      Last login:{" "}
                      {registrar.lastLoginAt
                        ? new Date(registrar.lastLoginAt).toLocaleString()
                        : "Never"}
                    </div>
                  )}
                </div>
          ))
        )}
      </div>
      </div>
    </DashboardShell>
  );
};

export default ManageRegistrars;
