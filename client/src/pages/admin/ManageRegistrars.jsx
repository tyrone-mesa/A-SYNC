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
    const { data } = await api.post("/admin/registrars", form);
    setCreated(data);
    setForm(emptyForm);
    load();
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
      <form
        onSubmit={submit}
        className="mb-8 grid gap-4 rounded-2xl bg-[#f8faf8] p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          className="input-field"
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(event) =>
            setForm({ ...form, fullName: event.target.value })
          }
        />
        <input
          className="input-field"
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <input
          className="input-field"
          required
          type="password"
          minLength={6}
          placeholder="Password (6+ characters)"
          value={form.password}
          onChange={(event) =>
            setForm({ ...form, password: event.target.value })
          }
        />
        <button className="btn-primary px-4 py-2">Create registrar</button>
      </form>

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

      <div className="rounded-2xl bg-[#f8faf8] p-5">
        {loading
          ? "Loading..."
          : registrars.length === 0
            ? "No registrar accounts yet."
            : registrars.map((registrar) => (
                <div
                  key={registrar._id}
                  className="border-b border-black/10 py-4 last:border-0"
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
                      className="btn-secondary px-3 py-1 text-xs"
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
                      className="btn-secondary px-3 py-1 text-xs"
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
                      className="btn-secondary px-3 py-1 text-xs"
                      onClick={() => resetPassword(registrar._id)}
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      className="btn-danger px-3 py-1 text-xs"
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
              ))}
      </div>
    </DashboardShell>
  );
};

export default ManageRegistrars;
