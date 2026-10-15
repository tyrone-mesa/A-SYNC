import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const MAX_CANDIDATES = 100;

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

const matchesQuery = (student, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${student.user?.fullName || ""} ${student.user?.email || ""} ${student.course || ""} ${student.studentId || ""}`
    .toLowerCase()
    .includes(q);
};

// Modal for one folder: shows its members and lets the coordinator search the students they
// oversee and add several at once.
const FolderModal = ({ folder, studentsById, students, onClose, onFolderChange }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const memberIds = useMemo(
    () => new Set((folder.students || []).map(String)),
    [folder.students],
  );
  const members = (folder.students || [])
    .map((id) => studentsById.get(String(id)))
    .filter(Boolean);

  const candidates = students.filter(
    (student) => !memberIds.has(String(student._id)) && matchesQuery(student, search),
  );
  const shownCandidates = candidates.slice(0, MAX_CANDIDATES);

  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const addSelected = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        `/staff/coordinator/folders/${folder._id}/students`,
        { studentIds: selected },
      );
      onFolderChange(data.folder);
      setSelected([]);
    } catch (err) {
      setError(errorMessage(err, "Failed to add students."));
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async (studentId) => {
    setError("");
    try {
      const { data } = await api.delete(
        `/staff/coordinator/folders/${folder._id}/students/${studentId}`,
      );
      onFolderChange(data.folder);
    } catch (err) {
      setError(errorMessage(err, "Failed to remove the student."));
    }
  };

  // Rendered in a portal: the dashboard section uses backdrop-blur, which would otherwise
  // become the containing block for this fixed overlay and break its positioning.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Folder: ${folder.name}`}
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/60 bg-[#f6faf4] p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5E7867]">
              Folder
            </p>
            <h2 className="break-words text-xl font-bold text-navy">{folder.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
            {error}
          </div>
        )}

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-bold text-navy">
            Students in this folder ({members.length})
          </h3>
          {members.length === 0 ? (
            <p className="rounded-xl bg-white/60 p-4 text-sm text-navy/65">
              No students in this folder yet. Add some below.
            </p>
          ) : (
            <ul className="divide-y divide-black/5 overflow-hidden rounded-xl border border-white/60 bg-white/60">
              {members.map((student) => (
                <li
                  key={student._id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#5E7867]">
                      {student.user?.fullName}
                    </p>
                    <p className="truncate text-xs text-navy/65">
                      {student.course || "No program"} · {student.user?.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      to={`/coordinator/students/${student._id}`}
                      onClick={onClose}
                      className="btn-secondary px-3 py-1.5 text-xs"
                      aria-label={`View details of ${student.user?.fullName}`}
                    >
                      View details
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeStudent(student._id)}
                      className="text-xs font-semibold text-[#DF2E1B] hover:underline"
                      aria-label={`Remove ${student.user?.fullName} from this folder`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-navy">Add students</h3>
          <input
            type="search"
            className="input-field mb-3 bg-white/65"
            placeholder="Search by name, email, or program"
            aria-label="Search students to add"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {candidates.length === 0 ? (
            <p className="rounded-xl bg-white/60 p-4 text-sm text-navy/65">
              {students.length === 0
                ? "There are no students in your programs yet."
                : search.trim()
                  ? "No students match your search."
                  : "Every student you oversee is already in this folder."}
            </p>
          ) : (
            <ul className="max-h-64 divide-y divide-black/5 overflow-y-auto rounded-xl border border-white/60 bg-white/60">
              {shownCandidates.map((student) => {
                const checked = selected.includes(student._id);
                return (
                  <li key={student._id}>
                    <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-white/70">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(student._id)}
                        className="h-4 w-4 shrink-0 accent-[#5E7867]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy">
                          {student.user?.fullName}
                        </span>
                        <span className="block truncate text-xs text-navy/65">
                          {student.course || "No program"} · {student.user?.email}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {candidates.length > MAX_CANDIDATES && (
            <p className="mt-2 text-xs text-navy/65">
              Showing the first {MAX_CANDIDATES} of {candidates.length} — type in the
              search box to narrow the list.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={selected.length === 0 || busy}
              onClick={addSelected}
              className="btn-primary px-5 py-2 text-sm"
            >
              {busy
                ? "Adding…"
                : selected.length > 0
                  ? `Add ${selected.length} selected`
                  : "Add selected"}
            </button>
            {shownCandidates.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelected(Array.from(new Set([...selected, ...shownCandidates.map((s) => s._id)])))
                }
                className="text-sm font-semibold text-[#5E7867] hover:underline"
              >
                Select all shown
              </button>
            )}
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-sm font-semibold text-navy/65 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
};

// "Student folders" section of the coordinator dashboard: create, rename, delete, and fill
// folders with students from the coordinator's own programs.
const CoordinatorFolders = ({ students }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [openId, setOpenId] = useState(null);

  const studentsById = useMemo(
    () => new Map(students.map((student) => [String(student._id), student])),
    [students],
  );

  const fetchFolders = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/coordinator/folders");
      setFolders(data.folders || []);
    } catch (err) {
      setError(errorMessage(err, "Failed to load folders."));
    }
  }, []);

  useEffect(() => {
    fetchFolders().finally(() => setLoading(false));
  }, [fetchFolders]);

  const replaceFolder = (folder) =>
    setFolders((items) =>
      items.map((item) => (item._id === folder._id ? folder : item)),
    );

  const sortByName = (items) =>
    [...items].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  const createFolder = async (event) => {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const { data } = await api.post("/staff/coordinator/folders", {
        name: newName,
      });
      setFolders((items) => sortByName([...items, data.folder]));
      setNewName("");
      setShowCreate(false);
      setOpenId(data.folder._id); // jump straight in so students can be added
    } catch (err) {
      setError(errorMessage(err, "Failed to create the folder."));
    } finally {
      setCreating(false);
    }
  };

  const saveRename = async (event, folder) => {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.put(`/staff/coordinator/folders/${folder._id}`, {
        name: renameValue,
      });
      setFolders((items) =>
        sortByName(items.map((item) => (item._id === folder._id ? data.folder : item))),
      );
      setRenamingId(null);
    } catch (err) {
      setError(errorMessage(err, "Failed to rename the folder."));
    }
  };

  const deleteFolder = async (folder) => {
    if (
      !window.confirm(
        `Delete the folder "${folder.name}"? The students themselves are not affected.`,
      )
    )
      return;
    setError("");
    try {
      await api.delete(`/staff/coordinator/folders/${folder._id}`);
      setFolders((items) => items.filter((item) => item._id !== folder._id));
    } catch (err) {
      setError(errorMessage(err, "Failed to delete the folder."));
    }
  };

  const openFolder = folders.find((folder) => folder._id === openId);

  return (
    <section className="mb-5 rounded-2xl border border-white/35 bg-white/25 p-3 shadow-sm backdrop-blur-md sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5E7867]">
          Student folders
        </p>
        <button
          type="button"
          onClick={() => {
            setShowCreate((open) => !open);
            setError("");
          }}
          className="rounded-full border border-forest/20 bg-[#dfeecf] px-4 py-2 text-sm font-medium text-[#5E7867] shadow-sm transition hover:brightness-95"
        >
          {showCreate ? "Cancel" : "+ New folder"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createFolder} className="mb-3 flex flex-col gap-3 sm:flex-row">
          <input
            className="input-field min-w-0 flex-1 bg-white/65"
            placeholder="Folder name (e.g. Batch A)"
            aria-label="Folder name"
            maxLength={60}
            required
            autoFocus
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="btn-primary px-5 py-2 text-sm"
          >
            {creating ? "Creating…" : "Create folder"}
          </button>
        </form>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]">
          {error}
        </div>
      )}

      {loading ? (
        <p className="p-4 text-sm text-navy/65">Loading folders…</p>
      ) : folders.length === 0 ? (
        <p className="rounded-xl bg-white/50 p-4 text-sm text-navy/65">
          No folders yet. Create one to group students together.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => {
            const count = (folder.students || []).filter((id) =>
              studentsById.has(String(id)),
            ).length;
            const renaming = renamingId === folder._id;
            return (
              <article
                key={folder._id}
                className="flex flex-col gap-3 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-sm"
              >
                {renaming ? (
                  <form
                    onSubmit={(event) => saveRename(event, folder)}
                    className="space-y-2"
                  >
                    <input
                      className="input-field bg-white"
                      aria-label="New folder name"
                      maxLength={60}
                      required
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={!renameValue.trim()}
                        className="btn-primary px-4 py-1.5 text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="btn-secondary px-4 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[#5E7867]">
                      {folder.name}
                    </p>
                    <p className="text-sm text-navy/65">
                      {count} student{count === 1 ? "" : "s"}
                    </p>
                  </div>
                )}
                {!renaming && (
                  <div className="mt-auto flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOpenId(folder._id)}
                      className="btn-secondary px-4 py-1.5 text-xs"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(folder._id);
                        setRenameValue(folder.name);
                        setError("");
                      }}
                      className="text-xs font-medium text-[#5E7867] hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFolder(folder)}
                      className="text-xs font-medium text-[#DF2E1B] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {openFolder && (
        <FolderModal
          folder={openFolder}
          students={students}
          studentsById={studentsById}
          onClose={() => setOpenId(null)}
          onFolderChange={replaceFolder}
        />
      )}
    </section>
  );
};

export default CoordinatorFolders;
