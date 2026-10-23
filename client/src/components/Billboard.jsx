import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { resolveAttachmentUrl } from "../utils/fileUrl";

const AUTO_ADVANCE_MS = 8000;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const CATEGORY_LABEL = {
  school: "School Announcement",
  company: "Company Advertisement",
};

const EMPTY_FORM = {
  title: "",
  caption: "",
  category: "school",
  linkUrl: "",
};

const Billboard = () => {
  const { user } = useAuth();
  const isFullAdmin = user?.role === "admin" && user?.adminType !== "read-only";

  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const touchStartX = useRef(null);

  const total = posts.length;

  const loadPosts = useCallback(async () => {
    try {
      const { data } = await api.get("/billboard");
      setPosts(data.posts || []);
    } catch (err) {
      setPosts([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Keep the index valid after a delete.
  useEffect(() => {
    if (index > 0 && index >= total) setIndex(Math.max(total - 1, 0));
  }, [index, total]);

  const move = useCallback(
    (direction) => {
      if (total < 2) return;
      setIndex((current) => (current + direction + total) % total);
    },
    [total],
  );

  // Auto-advance every 8 seconds. Because `index` is a dependency, using the
  // arrows or dots restarts the 8-second countdown.
  useEffect(() => {
    if (total < 2 || formOpen) return undefined;
    const timer = window.setTimeout(() => move(1), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [index, total, formOpen, move]);

  // Preview URL for the picked image.
  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const closeForm = () => {
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setFile(null);
    setError("");
  };

  const pickFile = (event) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (!chosen.type.startsWith("image/")) {
      setError("Please choose a picture file.");
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      setError("That picture is larger than 50 MB.");
      return;
    }
    setError("");
    setFile(chosen);
  };

  const submitPost = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a picture to post.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("title", form.title);
      body.append("caption", form.caption);
      body.append("category", form.category);
      body.append("linkUrl", form.linkUrl);
      body.append("image", file);
      await api.post("/billboard/admin", body);
      await loadPosts();
      setIndex(0);
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to post right now.");
    } finally {
      setBusy(false);
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm(`Delete "${post.title}" from the billboard?`)) return;
    try {
      await api.delete(`/billboard/admin/${post._id}`);
      await loadPosts();
    } catch (err) {
      window.alert(err.response?.data?.message || "Unable to delete the post.");
    }
  };

  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1);
  };

  // Visitors see nothing until an admin has posted something.
  if (!loaded || (total === 0 && !isFullAdmin)) return null;

  return (
    <section id="billboard" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
              Billboard
            </p>
            <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              Announcements &amp; Featured Companies
            </h2>
          </div>
          {isFullAdmin && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#0F3D2E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1E5D46] sm:self-auto"
            >
              <ImagePlus size={17} /> Post to billboard
            </button>
          )}
        </div>

        {total === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-[#1E5D46]/40 bg-white/50 px-6 py-16 text-center text-[#4B5768]">
            Nothing is posted yet. Use “Post to billboard” to add the first
            announcement or advertisement.
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-3xl bg-[#0F3D2E] shadow-[0_18px_50px_rgba(15,61,46,0.25)]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-roledescription="carousel"
            aria-label="School announcements and company advertisements"
          >
            <div
              className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {posts.map((post, i) => {
                const src = resolveAttachmentUrl(post.imageUrl);
                return (
                  <article
                    key={post._id}
                    className="relative aspect-[4/3] w-full shrink-0 sm:aspect-[16/9]"
                    aria-hidden={i !== index}
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${total}`}
                  >
                    {/* Blurred copy fills the frame so any picture shape fits. */}
                    <img
                      src={src}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                    />
                    <img
                      src={src}
                      alt={post.title}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="relative h-full w-full object-contain"
                    />
                    <div className="absolute inset-x-0 top-[30%] px-5 sm:px-8 md:px-14 lg:top-[40%]">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                          post.category === "school"
                            ? "bg-[#E8C165] text-[#0F3D2E]"
                            : "bg-white text-[#0F3D2E]"
                        }`}
                      >
                        {CATEGORY_LABEL[post.category]}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F3D2E]/95 via-[#0F3D2E]/70 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-7 md:px-14">
                      <h3 className="max-w-3xl text-xl font-extrabold leading-tight text-white sm:text-3xl">
                        {post.title}
                      </h3>
                      {post.caption && (
                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/85 sm:text-base">
                          {post.caption}
                        </p>
                      )}
                      {post.linkUrl && (
                        <a
                          href={post.linkUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#E8C165] hover:underline"
                        >
                          Learn more <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    {isFullAdmin && (
                      <button
                        type="button"
                        onClick={() => deletePost(post)}
                        aria-label={`Delete ${post.title}`}
                        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-red-600 shadow transition hover:bg-white"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous post"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0F3D2E] shadow-md transition hover:bg-white"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next post"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0F3D2E] shadow-md transition hover:bg-white"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute right-5 top-4 flex gap-1.5 sm:bottom-5 sm:top-auto">
                  {posts.map((post, i) => (
                    <button
                      key={post._id}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Show post ${i + 1}`}
                      aria-current={i === index}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? "w-6 bg-[#E8C165]" : "w-1.5 bg-white/60"
                      } ${isFullAdmin ? "hidden sm:block" : ""}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Post to billboard"
        >
          <form
            onSubmit={submitPost}
            className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-[#1D2939]">
                Post to billboard
              </h3>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="rounded-full p-2 text-[#4B5768] hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, category: value })}
                  aria-pressed={form.category === value}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                    form.category === value
                      ? "border-[#1E5D46] bg-[#1E5D46] text-white"
                      : "border-[#D9DEE5] text-[#1D2939]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-sm font-semibold text-[#1D2939]">
              Title
              <input
                required
                minLength={3}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#D9DEE5] px-3 py-2.5 font-normal"
              />
            </label>

            <label className="block text-sm font-semibold text-[#1D2939]">
              Caption (optional)
              <textarea
                maxLength={400}
                rows={3}
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#D9DEE5] px-3 py-2.5 font-normal"
              />
            </label>

            <label className="block text-sm font-semibold text-[#1D2939]">
              Link (optional)
              <input
                type="url"
                placeholder="https://"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#D9DEE5] px-3 py-2.5 font-normal"
              />
            </label>

            <div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1E5D46]/50 px-3 py-4 text-sm font-bold text-[#1E5D46]">
                <ImagePlus size={18} />
                {file ? "Change picture" : "Choose picture (up to 50 MB)"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp"
                  onChange={pickFile}
                  className="sr-only"
                />
              </label>
              {preview && (
                <img
                  src={preview}
                  alt="Selected preview"
                  className="mt-3 max-h-48 w-full rounded-xl object-contain"
                />
              )}
            </div>

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#E8C165] px-5 py-3 font-bold text-[#0F3D2E] transition hover:bg-[#DEB24E] disabled:opacity-60"
            >
              {busy ? "Posting..." : "Post"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default Billboard;
