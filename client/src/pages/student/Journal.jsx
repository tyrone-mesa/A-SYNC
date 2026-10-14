import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DashboardLoading from "../../components/DashboardLoading";
import DashboardShell from "../../components/DashboardShell";

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value) =>
  new Date(value).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Batch 4: OJT journal - daily reflective entries during immersion.
const Journal = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    entryDate: today(),
    activities: "",
    learnings: "",
    status: "draft",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/journals/mine")
      .then(({ data }) => setEntries(data.entries || []))
      .catch(() => setError("Failed to load journal entries."));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      entryDate: today(),
      activities: "",
      learnings: "",
      status: "draft",
    });
  };

  const startEdit = (entry) => {
    setEditingId(entry._id);
    setForm({
      entryDate: entry.entryDate.slice(0, 10),
      activities: entry.activities,
      learnings: entry.learnings || "",
      status: entry.status,
    });
    setNotice("");
    setError("");
  };

  const save = async (status) => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const payload = { ...form, status };
      if (editingId) {
        await api.put(`/journals/${editingId}`, payload);
        setNotice("Entry updated.");
      } else {
        await api.post("/journals", payload);
        setNotice(
          status === "submitted" ? "Entry submitted." : "Draft saved.",
        );
      }
      resetForm();
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save the entry.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await api.delete(`/journals/${id}`);
      if (editingId === id) resetForm();
      setNotice("Entry deleted.");
      await load();
    } catch (err) {
      setError("Failed to delete the entry.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLoading role="student" />;

  return (
    <DashboardShell
      role="student"
      title="OJT Journal"
      subtitle="Record what you did and learned each day of your immersion."
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

        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy/60">
            {editingId ? "Edit entry" : "New entry"}
          </h3>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-navy/65">Date</label>
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) =>
                  setForm({ ...form, entryDate: e.target.value })
                }
                className="input-field py-1.5 text-sm"
                max={today()}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-navy/65">
                What did you do today?
              </label>
              <textarea
                rows={3}
                value={form.activities}
                onChange={(e) =>
                  setForm({ ...form, activities: e.target.value })
                }
                placeholder="Tasks, tools used, people you worked with..."
                className="input-field py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-navy/65">
                What did you learn or find challenging? (optional)
              </label>
              <textarea
                rows={2}
                value={form.learnings}
                onChange={(e) =>
                  setForm({ ...form, learnings: e.target.value })
                }
                className="input-field py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                disabled={busy || !form.activities.trim()}
                onClick={() => save("submitted")}
                className="btn-primary h-9 px-4"
              >
                {busy ? "Saving…" : "Submit Entry"}
              </button>
              <button
                type="button"
                disabled={busy || !form.activities.trim()}
                onClick={() => save("draft")}
                className="btn-secondary h-9 px-4"
              >
                Save Draft
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-navy/60 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy/60">
            Entries ({entries.length})
          </h3>
          {entries.length === 0 ? (
            <p className="py-2 text-sm text-navy/60">
              No journal entries yet — write your first one above.
            </p>
          ) : (
            <div className="divide-y divide-black/10">
              {entries.map((entry) => (
                <div key={entry._id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-navy">
                      {formatDate(entry.entryDate)}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={`text-sm font-bold ${
                          entry.status === "submitted"
                            ? "text-[#5E7867]"
                            : "text-navy/50"
                        }`}
                      >
                        {entry.status === "submitted" ? "Submitted" : "Draft"}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(entry)}
                        className="font-medium text-[#2F6FE4] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(entry._id)}
                        className="font-medium text-[#DF2E1B] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-navy/80">
                    {entry.activities}
                  </p>
                  {entry.learnings && (
                    <p className="mt-1 text-sm italic text-navy/60">
                      {entry.learnings}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Journal;
