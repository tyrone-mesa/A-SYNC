import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import SelectDropdown from "./SelectDropdown";

const POLL_INTERVAL_MS = 30000;
const THREAD_POLL_INTERVAL_MS = 15000;

const getUserId = (user) => user?._id || user?.id;

const getOtherParticipant = (conversation, currentUserId) =>
  conversation?.participants?.find(
    (participant) => String(participant._id) !== String(currentUserId),
  );

const formatMessageTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const categories = [
  ["account_access", "Account access"],
  ["technical_issue", "Technical issue"],
  ["placement", "Placement"],
  ["records", "Student records"],
  ["other", "Other"],
];

const statusLabel = {
  open: "Open",
  responded: "Admin responded",
  resolved: "Resolved",
};

const FloatingMessageCircle = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [messageTab, setMessageTab] = useState("inbox");
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");
  const threadEndRef = useRef(null);
  const [concerns, setConcerns] = useState([]);
  const [activeConcernId, setActiveConcernId] = useState(null);
  const [loadingConcerns, setLoadingConcerns] = useState(false);
  const [adminConcernReply, setAdminConcernReply] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    let requestInFlight = false;
    const refreshUnread = () => {
      if (
        document.visibilityState !== "visible" ||
        requestInFlight
      ) return;
      requestInFlight = true;
      api
        .get("/messages/unread-count")
        .then(({ data }) => setUnreadCount(data.count))
        .catch(() => {})
        .finally(() => {
          requestInFlight = false;
        });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };

    refreshUnread();
    const interval = setInterval(refreshUnread, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  const loadMessageConversations = async (silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const { data } = await api.get("/messages/conversations");
      const items = data.conversations || [];
      setConversations(items);
      setActiveConversationId((current) =>
        current && items.some((item) => item._id === current)
          ? current
          : null,
      );
    } catch (requestError) {
      if (!silent) {
        setMessageError(
          requestError.response?.data?.message ||
            "Unable to load your messages. Please try again.",
        );
      }
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const openMessages = async () => {
    setOpen(false);
    setMessageError("");
    setActiveConversationId(null);
    setThreadMessages([]);
    setMessageTab("inbox");
    setContacts([]);
    setPanel("messages");
    await loadMessageConversations();
  };

  useEffect(() => {
    if (panel !== "messages") return undefined;
    let requestInFlight = false;
    const refreshConversations = () => {
      if (document.visibilityState !== "visible" || requestInFlight) return;
      requestInFlight = true;
      loadMessageConversations(true).finally(() => {
        requestInFlight = false;
      });
    };
    const interval = setInterval(
      refreshConversations,
      THREAD_POLL_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [panel]);

  useEffect(() => {
    if (panel !== "messages" || !activeConversationId) {
      setThreadMessages([]);
      return undefined;
    }

    let cancelled = false;
    let requestInFlight = false;
    const refreshThread = (showLoading = false) => {
      if (
        document.visibilityState !== "visible" ||
        requestInFlight
      ) {
        return Promise.resolve();
      }
      requestInFlight = true;
      if (showLoading) setLoadingThread(true);
      return api
        .get(`/messages/conversations/${activeConversationId}/messages`)
        .then(({ data }) => {
          if (!cancelled) {
            setThreadMessages(data.messages || []);
            api
              .get("/messages/unread-count")
              .then(({ data: unread }) => setUnreadCount(unread.count))
              .catch(() => {});
          }
        })
        .catch((requestError) => {
          if (!cancelled) {
            setMessageError(
              requestError.response?.data?.message ||
                "Unable to load this conversation.",
            );
          }
        })
        .finally(() => {
          requestInFlight = false;
          if (showLoading && !cancelled) setLoadingThread(false);
        });
    };

    refreshThread(true);
    const interval = setInterval(
      () => refreshThread(),
      THREAD_POLL_INTERVAL_MS,
    );
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [panel, activeConversationId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const loadContacts = async () => {
    setMessageError("");
    setMessageTab("compose");
    if (contacts.length) return;
    setLoadingMessages(true);
    try {
      const { data } = await api.get("/messages/contacts");
      setContacts(data.contacts || []);
    } catch (requestError) {
      setMessageError(
        requestError.response?.data?.message ||
          "Unable to load users to message.",
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadAdminConcerns = async (silent = false) => {
    if (!silent) setLoadingConcerns(true);
    try {
      const { data } = await api.get("/messages/public-concerns");
      const items = data.concerns || [];
      setConcerns(items);
      setActiveConcernId((current) =>
        current && items.some((item) => item._id === current) ? current : null,
      );
    } catch (requestError) {
      if (!silent) {
        setMessageError(
          requestError.response?.data?.message ||
            "Unable to load the public concerns inbox.",
        );
      }
    } finally {
      if (!silent) setLoadingConcerns(false);
    }
  };

  const openConcerns = async () => {
    setOpen(false);
    setMessageError("");
    setActiveConcernId(null);
    setPanel("concerns");
    await loadAdminConcerns();
  };

  useEffect(() => {
    if (panel !== "concerns") return undefined;
    let requestInFlight = false;
    const refreshConcerns = () => {
      if (document.visibilityState !== "visible" || requestInFlight) return;
      requestInFlight = true;
      loadAdminConcerns(true).finally(() => {
        requestInFlight = false;
      });
    };
    const interval = setInterval(refreshConcerns, THREAD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [panel]);

  const handleAdminConcernReply = async (event) => {
    event.preventDefault();
    if (!activeConcernId || !adminConcernReply.trim() || submitting) return;
    setSubmitting(true);
    setMessageError("");
    try {
      const { data } = await api.post(
        `/messages/public-concerns/${activeConcernId}/replies`,
        { body: adminConcernReply.trim() },
      );
      setConcerns((items) =>
        items.map((item) =>
          item._id === data.concern._id ? data.concern : item,
        ),
      );
      setAdminConcernReply("");
    } catch (requestError) {
      setMessageError(
        requestError.response?.data?.message ||
          "Unable to send the response.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminConcernStatus = async (status) => {
    if (!activeConcernId || submitting) return;
    setSubmitting(true);
    setMessageError("");
    try {
      const { data } = await api.put(
        `/messages/public-concerns/${activeConcernId}/status`,
        { status },
      );
      setConcerns((items) =>
        items.map((item) =>
          item._id === data.concern._id ? data.concern : item,
        ),
      );
    } catch (requestError) {
      setMessageError(
        requestError.response?.data?.message ||
          "Unable to update the concern status.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startMessageConversation = async (contact) => {
    if (sendingMessage) return;
    setSendingMessage(true);
    setMessageError("");
    try {
      const { data } = await api.post("/messages/conversations", {
        otherUserId: contact._id,
      });
      const conversation = data.conversation;
      setConversations((items) => [
        conversation,
        ...items.filter((item) => item._id !== conversation._id),
      ]);
      setActiveConversationId(conversation._id);
      setThreadMessages([]);
      setMessageDraft("");
      setContactSearch("");
      setMessageTab("inbox");
    } catch (requestError) {
      setMessageError(
        requestError.response?.data?.message ||
          "Unable to start this conversation.",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const sendDirectMessage = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !messageDraft.trim() || sendingMessage) return;
    setSendingMessage(true);
    setMessageError("");
    try {
      const { data } = await api.post(
        `/messages/conversations/${activeConversationId}/messages`,
        { body: messageDraft.trim() },
      );
      setThreadMessages((items) => [...items, data.message]);
      setMessageDraft("");
      await loadMessageConversations(true);
    } catch (requestError) {
      setMessageError(
        requestError.response?.data?.message ||
          "Your message could not be sent. Please try again.",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const currentUserId = getUserId(user);
  const activeConversation = conversations.find(
    (conversation) => conversation._id === activeConversationId,
  );
  const activeRecipient = getOtherParticipant(
    activeConversation,
    currentUserId,
  );
  const filteredContacts = contacts.filter((contact) => {
    const query = contactSearch.trim().toLowerCase();
    return (
      !query ||
      `${contact.fullName} ${contact.email} ${contact.role}`
        .toLowerCase()
        .includes(query)
    );
  });

  useEffect(() => {
    if (panel !== "concern-form" || user?.role === "admin")
      return undefined;
    const loadConcerns = () => {
      api
        .get("/messages/public-concerns/mine")
        .then(({ data }) => {
          const items = data.concerns || [];
          setConcerns(items);
          setActiveConcernId((current) =>
            items.some((item) => item._id === current)
              ? current
              : items[0]?._id || null,
          );
        })
        .catch((requestError) =>
          setError(
            requestError.response?.data?.message ||
              "Unable to load your concerns.",
          ),
        )
        .finally(() => setLoadingConcerns(false));
    };
    setLoadingConcerns(true);
    loadConcerns();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadConcerns();
    }, 30000);
    return () => clearInterval(interval);
  }, [panel, user?.role]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target))
        {
          setOpen(false);
          setPanel(null);
        }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPanel(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!user) return null;

  const activeConcern = concerns.find(
    (concern) => concern._id === activeConcernId,
  );

  const closeConcern = () => {
    setPanel(null);
    setError("");
  };

  const handleSubmitConcern = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/messages/public-concerns", {
        subject,
        category,
        message,
      });
      setConcerns((items) => [data.concern, ...items]);
      setActiveConcernId(data.concern._id);
      setSubject("");
      setCategory("other");
      setMessage("");
      api
        .get("/messages/unread-count")
        .then(({ data: unread }) => setUnreadCount(unread.count))
        .catch(() => {});
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to submit your concern. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    if (!activeConcern || !reply.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(
        `/messages/public-concerns/${activeConcern._id}/replies`,
        { body: reply },
      );
      setConcerns((items) =>
        items.map((item) =>
          item._id === data.concern._id ? data.concern : item,
        ),
      );
      setReply("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to send your reply. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bottom-[max(8.25rem,env(safe-area-inset-bottom))] right-4 z-50 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-6"
        style={{
          bottom: location.pathname.startsWith("/messages")
            ? "calc(env(safe-area-inset-bottom) + 5.5rem)"
            : undefined,
        }}
      >
        <AnimatePresence>
          {open && !panel && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96, transformOrigin: "bottom right" }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#dfe6df] bg-white p-2 shadow-[0_16px_48px_rgba(15,30,53,0.2)]"
            >
              <button
                type="button"
                onClick={openMessages}
                className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[#f2f7ef]"
              >
                <MessageCircle
                  size={19}
                  className="mt-0.5 shrink-0 text-[#17633e]"
                />
                <span>
                  <span className="block text-sm font-semibold text-navy">
                    Direct Message
                  </span>
                  <span className="mt-0.5 block text-xs text-navy/65">
                    Read and send private messages to users available to your role.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (user.role === "admin") {
                    openConcerns();
                  } else {
                    setError("");
                    setPanel("concern-form");
                  }
                }}
                className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[#f2f7ef]"
              >
                <span className="mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-[#dfeecf] text-[11px] font-bold text-[#17633e]">
                  !
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy">
                    {user.role === "admin" ? "Public Concerns Inbox" : "Public Concern"}
                  </span>
                  <span className="mt-0.5 block text-xs text-navy/65">
                    {user.role === "admin"
                      ? "Review and respond to concerns submitted to the admin."
                      : "Submit a concern directly to the system administrator."}
                  </span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {(panel === "messages" || panel === "concerns") && (
            <motion.section
              role="dialog"
              aria-label={
                panel === "concerns" ? "Public concerns inbox" : "Direct messages"
              }
              initial={{
                opacity: 0,
                x: 24,
                y: 12,
                scale: 0.96,
                transformOrigin: "bottom right",
              }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 14, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute bottom-[calc(100%+0.75rem)] right-0 flex h-[min(34rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#dfe6df] bg-[#f8faf6] shadow-[0_20px_60px_rgba(15,30,53,0.24)]"
            >
              <header className="flex shrink-0 items-center justify-between gap-3 bg-[#17633e] px-4 py-3 text-white">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {panel === "concerns"
                      ? "Public concerns inbox"
                      : activeConversationId
                      ? activeRecipient?.fullName || "Conversation"
                      : "Direct messages"}
                  </p>
                  <p className="text-[11px] text-white/75">
                    {panel === "concerns"
                      ? "Review, reply, and update status"
                      : activeConversationId
                      ? activeRecipient?.role || "Private conversation"
                      : "Review and respond to messages from users available to your role."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close message panel"
                  onClick={() => setPanel(null)}
                  className="rounded-full p-1.5 transition hover:bg-white/15"
                >
                  <X size={18} />
                </button>
              </header>

              {panel === "messages" ? (
                <div className="flex shrink-0 items-center gap-2 border-b border-black/10 bg-white px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageTab("inbox");
                      setMessageError("");
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${messageTab === "inbox" ? "bg-[#dfeecf] text-[#5E7867]" : "text-navy/65 hover:bg-navy/5"}`}
                  >
                    Inbox
                  </button>
                  <button
                    type="button"
                    onClick={loadContacts}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${messageTab === "compose" ? "bg-[#dfeecf] text-[#5E7867]" : "text-navy/65 hover:bg-navy/5"}`}
                  >
                    Compose
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPanel(null);
                      navigate("/messages");
                    }}
                    className="ml-auto text-[11px] font-semibold text-[#17633e] hover:underline"
                  >
                    Full Messages
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center justify-between border-b border-black/10 bg-white px-3 py-2">
                  <span className="text-xs font-semibold text-[#5E7867]">
                    Admin inbox
                  </span>
                  <button
                    type="button"
                    onClick={openMessages}
                    className="text-[11px] font-semibold text-[#17633e] hover:underline"
                  >
                    Direct messages
                  </button>
                </div>
              )}

              {messageError && (
                <p
                  role="alert"
                  className="shrink-0 border-b border-coral/20 bg-coral/10 px-3 py-2 text-xs text-[#b42318]"
                >
                  {messageError}
                </p>
              )}

              <AnimatePresence initial={false}>
                {panel === "concerns" ? (
                  <motion.div
                    key={`concerns-${activeConcernId || "list"}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    {loadingConcerns ? (
                      <p className="m-auto text-xs text-navy/60">
                        Loading concerns...
                      </p>
                    ) : !concerns.length ? (
                      <p className="m-auto px-5 text-center text-xs text-navy/60">
                        No public concerns have been submitted.
                      </p>
                    ) : activeConcern ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveConcernId(null)}
                          className="shrink-0 px-4 py-2 text-left text-xs font-semibold text-[#17633e] hover:bg-white"
                        >
                          ← All concerns
                        </button>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
                          <div className="rounded-xl border border-black/5 bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-navy">
                                  {activeConcern.subject || "Public concern"}
                                </p>
                                <p className="mt-1 break-all text-[10px] text-navy/60">
                                  {activeConcern.name} · {activeConcern.email}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-[#edf3e8] px-2 py-1 text-[10px] text-[#4a6b45]">
                                {statusLabel[activeConcern.status] || "Open"}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-navy/55">
                              {activeConcern.category || "other"} ·{" "}
                              {new Date(
                                activeConcern.createdAt,
                              ).toLocaleString()}
                            </p>
                            <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-navy">
                              {activeConcern.message}
                            </p>
                          </div>
                          {(activeConcern.replies || []).map((item, index) => (
                            <div
                              key={`${item._id || item.createdAt}-${index}`}
                              className={`rounded-xl p-3 ${item.authorRole === "admin" ? "bg-[#eaf3ee]" : "bg-white"}`}
                            >
                              <p className="mb-1 text-[10px] font-semibold text-navy/60">
                                {item.authorName ||
                                  (item.authorRole === "admin"
                                    ? "Administrator"
                                    : activeConcern.name)}{" "}
                                · {new Date(item.createdAt).toLocaleString()}
                              </p>
                              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-navy">
                                {item.body}
                              </p>
                            </div>
                          ))}
                          {!activeConcern.replies?.length &&
                            activeConcern.reply && (
                              <div className="rounded-xl bg-[#eaf3ee] p-3">
                                <p className="mb-1 text-[10px] font-semibold text-navy/60">
                                  Previous admin reply
                                </p>
                                <p className="whitespace-pre-wrap break-words text-xs text-navy">
                                  {activeConcern.reply}
                                </p>
                              </div>
                            )}
                        </div>
                        <div className="shrink-0 border-t border-black/10 bg-white p-3">
                          <div className="mb-2 flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() =>
                                handleAdminConcernStatus(
                                  activeConcern.status === "resolved"
                                    ? "open"
                                    : "resolved",
                                )
                              }
                              className="text-[10px] font-semibold text-[#17633e] hover:underline disabled:opacity-50"
                            >
                              {activeConcern.status === "resolved"
                                ? "Reopen"
                                : "Mark resolved"}
                            </button>
                          </div>
                          <form
                            onSubmit={handleAdminConcernReply}
                            className="flex items-end gap-2"
                          >
                            <textarea
                              value={adminConcernReply}
                              onChange={(event) =>
                                setAdminConcernReply(event.target.value)
                              }
                              rows={2}
                              maxLength={3000}
                              aria-label="Reply to public concern"
                              placeholder="Write an admin response..."
                              className="input-field min-h-10 min-w-0 flex-1 resize-none px-3 py-2 text-xs"
                            />
                            <button
                              type="submit"
                              disabled={
                                submitting || !adminConcernReply.trim()
                              }
                              className="rounded-xl bg-[#17633e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {submitting ? "Sending..." : "Reply"}
                            </button>
                          </form>
                        </div>
                      </>
                    ) : (
                      <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {concerns.map((concern) => (
                          <button
                            key={concern._id}
                            type="button"
                            onClick={() => setActiveConcernId(concern._id)}
                            className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-white"
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-navy">
                                {concern.subject || "Public concern"}
                              </span>
                              <span className="shrink-0 rounded-full bg-[#edf3e8] px-2 py-0.5 text-[10px] text-[#4a6b45]">
                                {statusLabel[concern.status] || "Open"}
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-[10px] text-navy/55">
                              {concern.name} ·{" "}
                              {new Date(concern.createdAt).toLocaleDateString()}
                            </span>
                            <span className="mt-1 block truncate text-[11px] text-navy/65">
                              {concern.message}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : panel === "concern-form" ? null : messageTab === "compose" ? (
                  <motion.div
                    key="compose"
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <div className="border-b border-black/5 p-3">
                      <label
                        htmlFor="message-bot-contact-search"
                        className="mb-1.5 block text-xs font-semibold text-navy"
                      >
                        Find a user
                      </label>
                      <input
                        id="message-bot-contact-search"
                        type="search"
                        value={contactSearch}
                        onChange={(event) =>
                          setContactSearch(event.target.value)
                        }
                        placeholder="Search name, email, or role"
                        className="input-field h-10 w-full px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                      {loadingMessages ? (
                        <p className="p-4 text-center text-xs text-navy/60">
                          Loading users...
                        </p>
                      ) : filteredContacts.length ? (
                        filteredContacts.map((contact) => (
                          <button
                            key={contact._id}
                            type="button"
                            disabled={sendingMessage}
                            onClick={() => startMessageConversation(contact)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white disabled:opacity-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-navy">
                                {contact.fullName}
                              </span>
                              <span className="block truncate text-[11px] text-navy/60">
                                {contact.email}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-[#eaf3ee] px-2 py-1 text-[10px] capitalize text-[#17633e]">
                              {contact.role}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="p-4 text-center text-xs text-navy/60">
                          {contacts.length
                            ? "No users match your search."
                            : "No available users to message."}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`inbox-${activeConversationId || "list"}`}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    {activeConversationId ? (
                      <>
                        <button
                          type="button"
                          aria-label="Back to inbox"
                          onClick={() => setActiveConversationId(null)}
                          className="mx-2 mb-1 mt-2 flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full border border-black/10 text-sm leading-none text-[#17633e] transition hover:bg-[#17633e] hover:text-white"
                        >
                          ←
                        </button>
                        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2">
                          {loadingThread ? (
                            <p className="m-auto text-xs text-navy/60">
                              Loading conversation...
                            </p>
                          ) : threadMessages.length ? (
                            threadMessages.map((item) => {
                              const senderId =
                                item.sender?._id || item.sender;
                              const isOwnMessage =
                                String(senderId) === String(currentUserId);
                              return (
                                <div
                                  key={item._id}
                                  className={`max-w-[88%] rounded-2xl px-3 py-2 ${isOwnMessage ? "ml-auto bg-[#17633e] text-white" : "mr-auto bg-white text-navy shadow-sm"}`}
                                >
                                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                                    {item.body}
                                  </p>
                                  <p
                                    className={`mt-1 text-right text-[9px] ${isOwnMessage ? "text-white/65" : "text-navy/50"}`}
                                  >
                                    {formatMessageTime(item.createdAt)}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <p className="m-auto max-w-[15rem] text-center text-xs text-navy/60">
                              No messages yet. Say hello to start the
                              conversation.
                            </p>
                          )}
                          <div ref={threadEndRef} />
                        </div>
                        <form
                          onSubmit={sendDirectMessage}
                          className="flex shrink-0 items-end gap-2 border-t border-black/10 bg-white p-3"
                        >
                          <textarea
                            value={messageDraft}
                            onChange={(event) =>
                              setMessageDraft(event.target.value)
                            }
                            rows={2}
                            maxLength={3000}
                            aria-label="Write a message"
                            placeholder="Write a message..."
                            className="input-field min-h-10 flex-1 resize-none px-3 py-2 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={!messageDraft.trim() || sendingMessage}
                            className="rounded-xl bg-[#17633e] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0f4d32] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sendingMessage ? "Sending..." : "Send"}
                          </button>
                        </form>
                      </>
                    ) : loadingMessages ? (
                      <p className="m-auto text-xs text-navy/60">
                        Loading inbox...
                      </p>
                    ) : conversations.length ? (
                      <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {conversations.map((conversation) => {
                          const other = getOtherParticipant(
                            conversation,
                            currentUserId,
                          );
                          return (
                            <button
                              key={conversation._id}
                              type="button"
                              onClick={() => {
                                setMessageError("");
                                setActiveConversationId(conversation._id);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf3ee] text-sm font-bold text-[#17633e]">
                                {(other?.fullName || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-navy">
                                    {other?.fullName || "Unknown user"}
                                  </span>
                                  <span className="shrink-0 text-[9px] text-navy/50">
                                    {formatMessageTime(
                                      conversation.lastMessageAt,
                                    )}
                                  </span>
                                </span>
                                <span className="block truncate text-[11px] text-navy/60">
                                  {conversation.lastMessagePreview ||
                                    "Open conversation"}
                                </span>
                              </span>
                              {conversation.unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#17633e] px-1 text-[10px] font-bold text-white">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="m-auto max-w-[15rem] px-4 text-center">
                        <MessageCircle
                          size={25}
                          className="mx-auto mb-2 text-[#5E7867]"
                        />
                        <p className="text-sm font-semibold text-navy">
                          Your inbox is empty
                        </p>
                        <p className="mt-1 text-xs text-navy/60">
                          Compose a message to start a conversation.
                        </p>
                        <button
                          type="button"
                          onClick={loadContacts}
                          className="mt-3 text-xs font-semibold text-[#17633e] hover:underline"
                        >
                          Compose a message
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => {
            if (panel) {
              setPanel(null);
              setOpen(false);
              return;
            }
            setOpen((value) => !value);
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label={
            unreadCount
              ? `Open messaging options, ${unreadCount} unread messages or concerns`
              : "Open messaging options"
          }
          aria-expanded={open || Boolean(panel)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-[#17633e] text-white shadow-[0_8px_24px_rgba(15,61,46,0.28)] transition-colors hover:bg-[#0f4d32] sm:h-14 sm:w-14"
        >
          {open || panel ? <X size={22} /> : <MessageCircle size={23} />}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#e74c3c] px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </motion.button>
      <AnimatePresence>
        {panel === "concern-form" && user.role !== "admin" && (
          <motion.div
            initial={{ opacity: 0, x: 24, y: 12, scale: 0.96, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 14, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute bottom-[calc(100%+0.75rem)] right-0 z-10 w-[min(32rem,calc(100vw-2rem))]"
          >
            <motion.section
              role="dialog"
              aria-labelledby="public-concern-title"
              className="flex max-h-[min(36rem,calc(100dvh-8rem))] w-full flex-col overflow-hidden rounded-2xl border border-[#dfe6df] bg-[#f8faf6] shadow-[0_20px_60px_rgba(15,30,53,0.24)]"
            >
              <header className="flex items-start justify-between border-b border-black/10 bg-white px-5 py-4">
                <div>
                  <h2
                    id="public-concern-title"
                    className="font-display text-xl font-bold text-navy"
                  >
                    Public Concern
                  </h2>
                  <p className="mt-1 text-xs text-navy/65">
                    Your concern is visible only to you and the administrator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeConcern}
                  aria-label="Close public concern"
                  className="rounded-full p-2 text-navy/65 transition hover:bg-navy/5 hover:text-navy"
                >
                  <X size={19} />
                </button>
              </header>

              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 sm:p-4">
                <div className="space-y-3">
                  <form
                    onSubmit={handleSubmitConcern}
                    className="space-y-3 rounded-xl border border-[#dfe6df] bg-white p-4"
                  >
                    <h3 className="font-display text-base font-semibold text-navy">
                      Submit a concern
                    </h3>
                    <label className="block text-xs font-semibold text-navy">
                      Subject
                      <input
                        required
                        minLength={3}
                        maxLength={160}
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        className="input-field mt-1 h-10 w-full px-3 py-2 text-sm"
                        placeholder="Briefly describe your concern"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-navy">
                      Category
                                            <SelectDropdown
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        options={categories.map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        className="input-field mt-1 h-10 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-navy">
                      Description
                      <textarea
                        required
                        minLength={10}
                        maxLength={3000}
                        rows={4}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="input-field mt-1 w-full resize-y px-3 py-2 text-sm"
                        placeholder="Include the details the admin should know..."
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSubject("");
                          setCategory("other");
                          setMessage("");
                          closeConcern();
                        }}
                        className="btn-secondary flex-1 px-4 py-2.5 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          submitting || !subject.trim() || !message.trim()
                        }
                        className="btn-primary flex-1 px-4 py-2.5 text-sm"
                      >
                        {submitting ? "Submitting..." : "Submit Concern"}
                      </button>
                    </div>
                  </form>

                  <div className="overflow-hidden rounded-xl border border-[#dfe6df] bg-white">
                    <p className="border-b border-black/5 px-4 py-3 text-xs font-semibold text-navy">
                      Your concerns
                    </p>
                    {loadingConcerns ? (
                      <p className="px-4 py-5 text-center text-xs text-navy/65">
                        Loading concerns...
                      </p>
                    ) : concerns.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-navy/65">
                        No concerns submitted yet.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {concerns.map((concern) => (
                          <button
                            key={concern._id}
                            type="button"
                            onClick={() => setActiveConcernId(concern._id)}
                            className={`block w-full border-b border-black/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-[#f2f7ef] ${
                              activeConcernId === concern._id
                                ? "bg-[#f2f7ef]"
                                : ""
                            }`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-navy">
                                {concern.subject || "Public concern"}
                              </span>
                              <span className="shrink-0 rounded-full bg-[#edf3e8] px-2 py-0.5 text-[10px] text-[#4a6b45]">
                                {statusLabel[concern.status] || "Open"}
                              </span>
                            </span>
                            <span className="mt-1 block text-[10px] text-navy/55">
                              {new Date(concern.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-64 flex-col overflow-hidden rounded-xl border border-[#dfe6df] bg-white">
                  {error && (
                    <p
                      role="alert"
                      className="border-b border-coral/20 bg-coral/10 px-4 py-2 text-xs text-[#a72b20]"
                    >
                      {error}
                    </p>
                  )}
                  {!activeConcern ? (
                    <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-navy/60">
                      Select a concern to view its history and any admin
                      response.
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-black/5 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-navy">
                              {activeConcern.subject || "Public concern"}
                            </p>
                            <p className="mt-1 text-[11px] text-navy/60">
                              {categories.find(
                                ([value]) => value === activeConcern.category,
                              )?.[1] || "Other"}{" "}
                              ·{" "}
                              {new Date(
                                activeConcern.createdAt,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#edf3e8] px-2 py-1 text-[10px] text-[#4a6b45]">
                            {statusLabel[activeConcern.status] || "Open"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        <div className="rounded-xl bg-[#edf3e8] p-3">
                          <p className="mb-1 text-[10px] font-semibold text-[#4a6b45]">
                            You ·{" "}
                            {new Date(activeConcern.createdAt).toLocaleString()}
                          </p>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-navy">
                            {activeConcern.message}
                          </p>
                        </div>
                        {(activeConcern.replies || []).map((item, index) => (
                          <div
                            key={`${item._id || item.createdAt}-${index}`}
                            className={`rounded-xl p-3 ${
                              item.authorRole === "admin"
                                ? "bg-[#f2f4f7]"
                                : "bg-[#edf3e8]"
                            }`}
                          >
                            <p className="mb-1 text-[10px] font-semibold text-navy/65">
                              {item.authorRole === "admin"
                                ? "Administrator"
                                : "You"}{" "}
                              · {new Date(item.createdAt).toLocaleString()}
                            </p>
                            <p className="whitespace-pre-wrap text-xs leading-relaxed text-navy">
                              {item.body}
                            </p>
                          </div>
                        ))}
                        {activeConcern.replies?.length === 0 &&
                          activeConcern.reply && (
                            <div className="ml-5 rounded-xl bg-[#f2f4f7] p-3">
                              <p className="mb-1 text-[10px] font-semibold text-navy/65">
                                Administrator ·{" "}
                                {activeConcern.repliedAt
                                  ? new Date(
                                      activeConcern.repliedAt,
                                    ).toLocaleString()
                                  : "Reply"}
                              </p>
                              <p className="whitespace-pre-wrap text-xs text-navy">
                                {activeConcern.reply}
                              </p>
                            </div>
                          )}
                      </div>
                      <form
                        onSubmit={handleReply}
                        className="flex gap-2 border-t border-black/5 p-3"
                      >
                        <input
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          maxLength={3000}
                          className="input-field h-10 min-w-0 flex-1 px-3 py-2 text-xs"
                          placeholder="Reply or add more information..."
                        />
                        <button
                          type="submit"
                          disabled={submitting || !reply.trim()}
                          className="btn-primary h-10 shrink-0 px-4 py-2 text-xs"
                        >
                          Reply
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default FloatingMessageCircle;
