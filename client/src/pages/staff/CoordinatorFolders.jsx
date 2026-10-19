import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const errorMessage = (err, fallback) =>
  err?.response?.data?.message || fallback;

const idOf = (x) => (typeof x === "string" ? x : x?._id);

// Coordinator "Student Folders": private, named groups of students (e.g. "4BSIT_2").
// API: /staff/coordinator/folders (list/create/rename/delete) and
//      /staff/coordinator/folders/:id/students (add/remove students).
const CoordinatorFolders = ({ students = [] }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const fetchFolders = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/coordinator/folders");
      setFolders(data.folders || []);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Could not load folders."));
    }
  }, []);

  useEffect(() => {
    fetchFolders().finally(() => setLoading(false));
  }, [fetchFolders]);

  const studentById = useMemo(() => {
    const map = new Map();
    students.forEach((s) => map.set(String(s._id), s));
    return map;
  }, [students]);

  const replaceFolder = (folder) =>
    setFolders((prev) =>
      prev
        .map((f) => (f._id === folder._id ? folder : f))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );

  const run = async (fn, fallback) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (err) {
      setError(errorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createFolder = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return setError("Folder name is required.");
    const ok = await run(async () => {
      const { data } = await api.post("/staff/coordinator/folders", { name });
      setFolders((prev) =>
        [...prev, data.folder].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }, "Could not create folder.");
    if (ok) {
      setNewName("");
      setCreating(false);
    }
  };

  const renameFolder = async (e, folder) => {
    e.preventDefault();
    const name = renameValue.trim();
    if (!name) return setError("Folder name is required.");
    const ok = await run(async () => {
      const { data } = await api.put(
        `/staff/coordinator/folders/${folder._id}`,
        { name },
      );
      replaceFolder(data.folder);
    }, "Could not rename folder.");
    if (ok) setRenamingId(null);
  };

  const deleteFolder = async (folder) => {
    if (
      !window.confirm(
        `Delete folder "${folder.name}"? The students themselves are not deleted.`,
      )
    )
      return;
    const ok = await run(async () => {
      await api.delete(`/staff/coordinator/folders/${folder._id}`);
      setFolders((prev) => prev.filter((f) => f._id !== folder._id));
    }, "Could not delete folder.");
    if (ok && openId === folder._id) setOpenId(null);
  };

  const addStudents = async (folder) => {
    if (selected.length === 0)
      return setError("Select at least one student to add.");
    const ok = await run(async () => {
      const { data } = await api.post(
        `/staff/coordinator/folders/${folder._id}/students`,
        { studentIds: selected },
      );
      replaceFolder(data.folder);
    }, "Could not add students.");
    if (ok) {
      setSelected([]);
      setSearch("");
      setAdding(false);
    }
  };

  const removeStudent = async (folder, studentId) => {
    await run(async () => {
      const { data } = await api.delete(
        `/staff/coordinator/folders/${folder._id}/students/${studentId}`,
      );
      replaceFolder(data.folder);
    }, "Could not remove student.");
  };

  const toggleOpen = (folder) => {
    setOpenId((cur) => (cur === folder._id ? null : folder._id));
    setAdding(false);
    setSelected([]);
    setSearch("");
  };

  const toggleSelected = (id) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const inputClass =
    "min-w-0 flex-1 rounded-xl border border-[#0b5d3d]/20 bg-white px-3 py-2 text-sm text-[#0F1E35] focus:border-[#0b5d3d] focus:outline-none";
  const pillBtn =
    "rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0F1E35] shadow-sm transition hover:bg-[#0b5d3d]/5 disabled:opacity-50";
  const linkBtn =
    "text-sm font-medium text-[#5E7867] hover:underline disabled:opacity-50";

  return (
    <section className="mb-6 rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5E7867]">
          Student folders
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setCreating((v) => !v);
            setNewName("");
            setError("");
          }}
          className="rounded-full bg-[#dfeecf] px-4 py-2 text-sm font-semibold text-[#3f5a45] shadow-sm transition hover:bg-[#d3e6bf] disabled:opacity-50"
        >
          {creating ? "Cancel" : "+ New folder"}
        </button>
      </div>

      {creating && (
        <form onSubmit={createFolder} className="mb-4 flex flex-wrap gap-2">
          <input
            autoFocus
            maxLength={60}
            className={inputClass}
            placeholder="Folder name (e.g. 4BSIT_2)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" disabled={busy} className={pillBtn}>
            Create
          </button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#0F1E35]/60">Loading folders…</p>
      ) : folders.length === 0 ? (
        <p className="text-sm text-[#0F1E35]/60">
          No folders yet. Create one to group your students.
        </p>
      ) : (
        <div className="space-y-4">
          {folders.map((folder) => {
            const memberIds = (folder.students || []).map(idOf).map(String);
            const members = memberIds
              .map((id) => studentById.get(id))
              .filter(Boolean);
            const isOpen = openId === folder._id;
            const isRenaming = renamingId === folder._id;
            const available = students.filter(
              (s) =>
                !memberIds.includes(String(s._id)) &&
                `${s.user?.fullName || ""} ${s.user?.email || ""}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            );

            return (
              <div
                key={folder._id}
                className="rounded-[20px] bg-white p-4 shadow-sm"
              >
                {isRenaming ? (
                  <form
                    onSubmit={(e) => renameFolder(e, folder)}
                    className="flex flex-wrap gap-2"
                  >
                    <input
                      autoFocus
                      maxLength={60}
                      className={inputClass}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                    <button type="submit" disabled={busy} className={pillBtn}>
                      Save
                    </button>
                    <button
                      type="button"
                      className={linkBtn}
                      onClick={() => setRenamingId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="break-words text-xl font-semibold text-[#3f5a45]">
                      {folder.name}
                    </p>
                    <p className="mt-1 text-[#0F1E35]/65">
                      {memberIds.length} student
                      {memberIds.length === 1 ? "" : "s"}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleOpen(folder)}
                        className={pillBtn}
                      >
                        {isOpen ? "Close" : "Open"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className={linkBtn}
                        onClick={() => {
                          setRenamingId(folder._id);
                          setRenameValue(folder.name);
                          setError("");
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                        onClick={() => deleteFolder(folder)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}

                {isOpen && (
                  <div className="mt-4 border-t border-black/10 pt-4">
                    {members.length === 0 ? (
                      <p className="text-sm text-[#0F1E35]/60">
                        This folder is empty.
                      </p>
                    ) : (
                      <div className="divide-y divide-black/10">
                        {members.map((s) => (
                          <div
                            key={s._id}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <Link
                              to={`/coordinator/students/${s._id}`}
                              className="min-w-0 truncate text-sm font-medium text-[#0F1E35] hover:underline"
                            >
                              {s.user?.fullName}
                            </Link>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeStudent(folder, s._id)}
                              className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!adding ? (
                      <button
                        type="button"
                        className={`${pillBtn} mt-3`}
                        onClick={() => {
                          setAdding(true);
                          setSelected([]);
                          setError("");
                        }}
                      >
                        + Add students
                      </button>
                    ) : (
                      <div className="mt-3 rounded-xl bg-[#f8fbfa] p-3">
                        <input
                          className={`${inputClass} mb-2 w-full`}
                          placeholder="Search students"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="max-h-56 overflow-y-auto">
                          {available.length === 0 && (
                            <p className="p-2 text-sm text-[#0F1E35]/60">
                              No students to add.
                            </p>
                          )}
                          {available.map((s) => (
                            <label
                              key={s._id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white"
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(String(s._id))}
                                onChange={() => toggleSelected(String(s._id))}
                              />
                              <span className="min-w-0 truncate">
                                {s.user?.fullName}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            disabled={busy || selected.length === 0}
                            onClick={() => addStudents(folder)}
                            className={pillBtn}
                          >
                            Add {selected.length > 0 ? `(${selected.length})` : ""}
                          </button>
                          <button
                            type="button"
                            className={linkBtn}
                            onClick={() => {
                              setAdding(false);
                              setSelected([]);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CoordinatorFolders;
