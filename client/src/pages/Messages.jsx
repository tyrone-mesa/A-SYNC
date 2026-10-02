import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/axios";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import DashboardShell from "../components/DashboardShell";

const getOtherParticipant = (conversation, myId) =>
  conversation.participants.find((p) => String(p._id) !== String(myId));

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getUserId = (user) => user?._id || user?.id;

const mergeMessages = (currentMessages, incomingMessages) => {
  const messagesById = new Map(
    currentMessages.map((message) => [message._id, message]),
  );
  incomingMessages.forEach((message) => {
    messagesById.set(message._id, {
      ...messagesById.get(message._id),
      ...message,
    });
  });
  return [...messagesById.values()].sort(
    (left, right) => new Date(left.createdAt) - new Date(right.createdAt),
  );
};

const Messages = () => {
  const { id: activeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const myUserId = getUserId(user);

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [concerns, setConcerns] = useState([]);
  const [loadingConcerns, setLoadingConcerns] = useState(false);
  const [activeConcernId, setActiveConcernId] = useState(null);
  const [concernReply, setConcernReply] = useState("");
  const [replyingConcern, setReplyingConcern] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [messageError, setMessageError] = useState("");
  const bottomRef = useRef(null);
  const loadingConversationsRef = useRef(false);

  const loadConversations = useCallback((silent = false) => {
    if (loadingConversationsRef.current) return;
    loadingConversationsRef.current = true;
    if (!silent) setMessageError("");
    api
      .get("/messages/conversations")
      .then(({ data }) => setConversations(data.conversations))
      .catch((error) => {
        if (!silent) {
          setMessageError(
            error.response?.data?.message ||
              (error.response?.status === 401
                ? "Your session has expired. Please log in again."
                : "Unable to load conversations right now."),
          );
        }
      })
      .finally(() => {
        loadingConversationsRef.current = false;
        setLoadingList(false);
      });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadConversations(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const openNewMessage = () => {
    setNewMessageOpen((open) => !open);
    if (contacts.length > 0) return;
    setLoadingContacts(true);
    api
      .get("/messages/contacts")
      .then(({ data }) => setContacts(data.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  };

  const startConversation = async (event, recipientId) => {
    event?.preventDefault();
    if (!recipientId || startingConversation) return;
    setStartingConversation(true);
    try {
      const { data } = await api.post("/messages/conversations", {
        otherUserId: recipientId,
      });
      setNewMessageOpen(false);
      setContactSearch("");
      navigate(`/messages/${data.conversation._id}`);
      loadConversations();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Failed to start conversation.",
      );
    } finally {
      setStartingConversation(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return true;
    return `${contact.fullName} ${contact.email} ${contact.role}`
      .toLowerCase()
      .includes(query);
  });

  const loadConcerns = (silent = false) => {
    if (user?.role !== "admin") return;
    if (!silent) setLoadingConcerns(true);
    api
      .get("/messages/public-concerns")
      .then(({ data }) => setConcerns(data.concerns || []))
      .catch(() => setConcerns([]))
      .finally(() => setLoadingConcerns(false));
  };

  useEffect(() => {
    if (user?.role === "admin" && searchParams.get("view") === "concerns") {
      loadConcerns();
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") loadConcerns(true);
      }, 30000);
      return () => clearInterval(interval);
    } else if (
      user?.role !== "admin" &&
      searchParams.get("view") === "my-concerns"
    ) {
      setLoadingConcerns(true);
      const loadMine = (silent = false) => {
        if (!silent) setLoadingConcerns(true);
        api
          .get("/messages/public-concerns/mine")
          .then(({ data }) => setConcerns(data.concerns || []))
          .catch(() => setConcerns([]))
          .finally(() => setLoadingConcerns(false));
      };
      loadMine(true);
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") loadMine(true);
      }, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [user?.role, searchParams]);

  useEffect(() => {
    const requestedConcernId = searchParams.get("concernId");
    if (
      requestedConcernId &&
      concerns.some((concern) => concern._id === requestedConcernId)
    ) {
      setActiveConcernId(requestedConcernId);
    }
  }, [concerns, searchParams]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessages([]);
    setLoadingThread(true);
    api
      .get(`/messages/conversations/${activeId}/messages`)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((current) => mergeMessages(current, data.messages));
        loadConversations(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setMessageError(
          error.response?.data?.message ||
            (error.response?.status === 401
              ? "Your session has expired. Please log in again."
              : "Unable to load this conversation. Check that you have access."),
        );
        setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, loadConversations]);

  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    let requestInFlight = false;
    const refreshThread = () => {
      if (
        document.visibilityState !== "visible" ||
        requestInFlight
      ) return;
      requestInFlight = true;
      api
        .get(`/messages/conversations/${activeId}/messages`)
        .then(({ data }) => {
          if (!cancelled)
            setMessages((current) =>
              mergeMessages(current, data.messages || []),
            );
        })
        .catch(() => {})
        .finally(() => {
          requestInFlight = false;
        });
    };
    const interval = setInterval(refreshThread, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const body = draft.trim();
    setMessageError("");
    setSending(true);
    try {
      const { data } = await api.post(
        `/messages/conversations/${activeId}/messages`,
        {
          body,
        },
      );
      setMessages((prev) => mergeMessages(prev, [data.message]));
      setDraft((current) => (current === body ? "" : current));
      loadConversations();
    } catch (error) {
      setMessageError(
        error.response?.data?.message ||
          (error.response?.status === 401
            ? "Your session has expired. Please log in again."
            : "Message could not be delivered. Please retry."),
      );
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeId) return;
    const confirmed = window.confirm(
      "Delete this conversation permanently? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/messages/conversations/${activeId}`);
      navigate("/messages");
      loadConversations();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Failed to delete conversation.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const activeConversation = conversations.find((c) => c._id === activeId);
  const concernsView =
    user?.role === "admin" && searchParams.get("view") === "concerns";
  const myConcernsView =
    user?.role !== "admin" && searchParams.get("view") === "my-concerns";
  const showingConcerns = concernsView || myConcernsView;

  const handleReplyToConcern = async (event) => {
    event.preventDefault();
    if (!activeConcernId || !concernReply.trim() || replyingConcern) return;
    setReplyingConcern(true);
    try {
      const { data } = await api.post(
        `/messages/public-concerns/${activeConcernId}/replies`,
        { body: concernReply },
      );
      setConcerns((items) =>
        items.map((item) =>
          item._id === data.concern._id ? data.concern : item,
        ),
      );
      setConcernReply("");
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Failed to reply to the concern.",
      );
    } finally {
      setReplyingConcern(false);
    }
  };

  const handleConcernStatus = async (status) => {
    if (!activeConcernId) return;
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
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Failed to update concern status.",
      );
    }
  };

  return (
    <DashboardShell
      role={user?.role || "student"}
      title="Messages"
      subtitle={
        concernsView
          ? "Review, reply to, and resolve concerns submitted by registered users."
          : myConcernsView
            ? "View your concerns and responses from the system administrator."
            : "Direct conversations between you and the other side."
      }
    >
      {messageError && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-[#DF2E1B]"
        >
          {messageError}
        </div>
      )}
      <div className="mx-auto max-w-6xl">
        <div
          className={`messages-shell ${newMessageOpen ? "messages-shell--compose-open" : ""}`}
        >
          <div className="messages-toolbar">
            <button
              type="button"
              onClick={() => navigate("/messages")}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${!concernsView ? "bg-[#dfeecf] text-[#5E7867] shadow-sm" : "text-navy/65 hover:bg-navy/5"}`}
            >
              Direct Messages
            </button>
            {user?.role === "admin" && (
              <button
                type="button"
                onClick={() => navigate("/messages?view=concerns")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${concernsView ? "bg-[#dfeecf] text-[#5E7867] shadow-sm" : "text-navy/65 hover:bg-navy/5"}`}
              >
                Public Concerns
              </button>
            )}
            {myConcernsView && (
              <button
                type="button"
                onClick={() => navigate("/messages?view=my-concerns")}
                className="rounded-full bg-[#dfeecf] px-3 py-1.5 text-[11px] font-semibold text-[#5E7867] shadow-sm"
              >
                My Concerns
              </button>
            )}
            {[
              "student",
              "company",
              "admin",
              "coordinator",
              "registrar",
            ].includes(user?.role) && (
              <button
                type="button"
                onClick={openNewMessage}
                className={`ml-auto rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${newMessageOpen ? "bg-[#dfeecf] text-[#5E7867] shadow-sm" : "bg-white text-[#5E7867] shadow-sm hover:bg-[#f9f7f4]"}`}
              >
                {newMessageOpen ? "Close" : "Compose"}
              </button>
            )}
          </div>

          {newMessageOpen && (
            <div className="messages-compose-panel">
              <label
                htmlFor="message-recipient-search"
                className="text-xs font-semibold text-navy"
              >
                Send to
              </label>
              <input
                type="search"
                id="message-recipient-search"
                aria-label="Search registered users"
                placeholder="Search registered users..."
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                className={`input-field h-9 min-w-0 w-full flex-1 px-3 py-2 text-sm sm:w-auto sm:min-w-[220px] sm:flex-none ${
                  /^\d+$/.test(contactSearch.trim()) ? "numeric-value" : ""
                }`}
              />
              <div className="flex min-w-0 w-full flex-1 flex-wrap gap-1.5 sm:w-auto sm:min-w-[220px] sm:flex-none">
                {loadingContacts ? (
                  <span className="px-2 py-2 text-xs text-navy/65">
                    Loading registered users...
                  </span>
                ) : (
                  filteredContacts.slice(0, 8).map((contact) => (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={(event) => startConversation(event, contact._id)}
                      disabled={startingConversation}
                      className="rounded-full border border-[#dfe6df] bg-white px-3 py-1.5 text-left text-xs font-semibold text-[#5E7867] transition hover:bg-[#dfeecf] disabled:opacity-50"
                    >
                      {contact.fullName}{" "}
                      <span className="font-normal text-navy/65">
                        ({contact.role})
                      </span>
                    </button>
                  ))
                )}
              </div>
              {!loadingContacts &&
                contacts.length > 0 &&
                filteredContacts.length === 0 && (
                  <span className="text-xs text-navy/65">
                    No registered users found.
                  </span>
                )}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={showingConcerns ? "public-concerns" : "direct-messages"}
              initial={{ opacity: 0, x: showingConcerns ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: showingConcerns ? -24 : 24 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`messages-content ${!concernsView ? "messages-direct-content" : ""}`}
            >
              {showingConcerns ? (
                <div className="messages-content col-span-full">
                  <div
                    className={`messages-sidebar messages-direct-sidebar ${
                      activeConcernId ? "hidden md:block" : ""
                    }`}
                  >
                    {loadingConcerns ? (
                      <Loader />
                    ) : concerns.length === 0 ? (
                      <p className="p-6 text-center text-sm text-navy/65">
                        No public concerns yet.
                      </p>
                    ) : (
                      concerns.map((concern) => (
                        <button
                          key={concern._id}
                          type="button"
                          onClick={() => setActiveConcernId(concern._id)}
                          className={`w-full border-b border-black/5 px-4 py-3 text-left hover:bg-navy/5 ${activeConcernId === concern._id ? "bg-navy/5" : ""}`}
                        >
                          <p className="truncate text-sm font-medium text-navy">
                            {concern.subject || concern.name || "Public concern"}
                          </p>
                          <p className="truncate text-xs text-navy/65">
                            {concern.name} ({concern.submitterRole || "public"})
                          </p>
                          <p className="mt-1 truncate text-xs text-navy/65">
                            {concern.message}
                          </p>
                          <p className="mt-1 text-[10px] text-navy/50">
                            {concern.category || "other"} ·{" "}
                            {concern.status || "open"} ·{" "}
                            {new Date(concern.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <div
                    className={`messages-thread ${activeConcernId ? "" : "hidden md:flex"}`}
                  >
                    {(() => {
                      const concern = concerns.find(
                        (item) => item._id === activeConcernId,
                      );
                      if (!concern)
                        return (
                          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-navy/65">
                            Select a concern to read and reply.
                          </div>
                        );
                      return (
                        <>
                          <div className="border-b border-black/10 px-4 py-3 md:hidden">
                            <button
                              type="button"
                              onClick={() => setActiveConcernId(null)}
                              className="text-sm font-medium text-[#457D53]"
                            >
                              ← Back
                            </button>
                          </div>
                          <div className="border-b border-black/10 px-4 py-4">
                            <p className="font-semibold text-navy">
                              {concern.subject || "Public concern"}
                            </p>
                            <p className="text-xs text-navy/65">
                              {concern.name} · {concern.email}
                              {concern.submitterRole
                                ? ` · ${concern.submitterRole}`
                                : ""}
                            </p>
                            <p className="mt-1 text-xs text-navy/65">
                              {concern.category || "other"} ·{" "}
                              {concern.status || "open"} ·{" "}
                              {new Date(concern.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex-1 space-y-3 overflow-y-auto p-4">
                            <div className="chat-bubble chat-bubble--other max-w-full">
                              <p className="mb-1 text-[10px] font-semibold text-navy/60">
                                {concern.name} ·{" "}
                                {new Date(concern.createdAt).toLocaleString()}
                              </p>
                              <p className="whitespace-pre-line">
                                {concern.message}
                              </p>
                            </div>
                            {(concern.replies || []).map((item, index) => (
                              <div
                                key={`${item._id || item.createdAt}-${index}`}
                                className={`chat-bubble max-w-full ${
                                  item.authorRole === "admin"
                                    ? "chat-bubble--mine ml-auto"
                                    : "chat-bubble--other"
                                }`}
                              >
                                <p className="mb-1 text-[10px] font-semibold text-navy/60">
                                  {item.authorName} ({item.authorRole}) ·{" "}
                                  {new Date(item.createdAt).toLocaleString()}
                                </p>
                                <p className="whitespace-pre-line">
                                  {item.body}
                                </p>
                              </div>
                            ))}
                            {concern.replies?.length === 0 &&
                              concern.reply && (
                                <div className="chat-bubble chat-bubble--mine ml-auto max-w-full">
                                  <p className="mb-1 text-[10px] font-semibold text-navy/60">
                                    Administrator ·{" "}
                                    {concern.repliedAt
                                      ? new Date(
                                          concern.repliedAt,
                                        ).toLocaleString()
                                      : ""}
                                  </p>
                                  <p className="whitespace-pre-line">
                                    {concern.reply}
                                  </p>
                                </div>
                              )}
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-black/5 px-4 py-2">
                            <span className="text-xs font-semibold capitalize text-navy/65">
                              Status: {concern.status || "open"}
                            </span>
                            {user?.role === "admin" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConcernStatus(
                                    concern.status === "resolved"
                                      ? "open"
                                      : "resolved",
                                  )
                                }
                                className="rounded-full border border-[#dfe6df] bg-white px-3 py-1 text-xs font-semibold text-[#457D53] hover:bg-[#f2f7ef]"
                              >
                                {concern.status === "resolved"
                                  ? "Reopen"
                                  : "Mark resolved"}
                              </button>
                            )}
                          </div>
                          <form
                            onSubmit={handleReplyToConcern}
                            className="messages-composer"
                          >
                            <input
                              className="input-field h-9 flex-1 px-3 py-2 text-sm"
                              placeholder={
                                user?.role === "admin"
                                  ? "Reply to this concern..."
                                  : "Add information or reply..."
                              }
                              value={concernReply}
                              onChange={(event) =>
                                setConcernReply(event.target.value)
                              }
                            />
                            <button
                              type="submit"
                              disabled={replyingConcern || !concernReply.trim()}
                              className="btn-primary h-9 px-4 py-2 text-sm"
                            >
                              {replyingConcern
                                ? "Sending..."
                                : user?.role === "admin"
                                  ? "Reply"
                                  : "Send"}
                            </button>
                          </form>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`messages-sidebar ${
                      activeId ? "hidden md:block" : ""
                    }`}
                  >
                    {loadingList ? (
                      <div className="p-6">
                        <Loader />
                      </div>
                    ) : conversations.length === 0 ? (
                      <p className="px-4 py-10 text-center text-sm text-navy/65">
                        No conversations yet. Start one from a job listing or an
                        applicant's profile.
                      </p>
                    ) : (
                      conversations.map((conv) => {
                        const other = getOtherParticipant(conv, myUserId);
                        return (
                          <button
                            key={conv._id}
                            onClick={() => navigate(`/messages/${conv._id}`)}
                            className={`w-full border-b border-black/5 px-4 py-3 text-left transition hover:bg-navy/5 ${
                              conv._id === activeId ? "bg-navy/5" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-navy">
                                {other?.fullName}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            {conv.job?.title && (
                              <p className="truncate text-xs text-navy/65">
                                {conv.job.title}
                              </p>
                            )}
                            <p className="mt-0.5 truncate text-xs text-navy/65">
                              {conv.lastMessagePreview || "No messages yet"}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeId || "empty-thread"}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className={`messages-thread messages-direct-thread ${activeId ? "" : "hidden md:flex"}`}
                    >
                      <div className="border-b border-black/10 px-4 py-3 md:hidden">
                        <button
                          onClick={() => navigate("/messages")}
                          className="text-sm font-medium text-[#457D53]"
                        >
                          ← Back
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-navy">
                            {activeConversation
                              ? getOtherParticipant(
                                  activeConversation,
                                  myUserId,
                                )?.fullName
                              : "No conversation selected"}
                          </p>
                          {activeConversation?.job?.title && (
                            <p className="text-xs text-navy/65">
                              {activeConversation.job.title}
                            </p>
                          )}
                        </div>
                        {user?.role === "admin" && activeId && (
                          <button
                            type="button"
                            onClick={handleDeleteConversation}
                            disabled={deleting}
                            className="btn-danger h-9 shrink-0 px-3 py-2 text-xs"
                          >
                            {deleting ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </div>

                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                        {!activeId ? (
                          <div className="flex h-full items-center justify-center text-sm text-navy/65">
                            Select a conversation to view messages.
                          </div>
                        ) : loadingThread ? (
                          <Loader />
                        ) : (
                          <>
                            {messages.map((m) => {
                              const isMine =
                                String(m.sender?._id || m.sender?.id) ===
                                String(myUserId);
                              return (
                                <div
                                  key={m._id}
                                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`chat-bubble ${isMine ? "chat-bubble--mine" : "chat-bubble--other"}`}
                                  >
                                    <p className="whitespace-pre-line leading-relaxed">
                                      {m.body}
                                    </p>
                                    <p className="mt-1 text-left text-[9px] leading-none text-navy/65">
                                      {formatTime(m.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={bottomRef} />
                          </>
                        )}
                      </div>

                      <form
                        onSubmit={handleSend}
                        className="messages-composer messages-direct-composer"
                      >
                        <input
                          className={`input-field h-9 min-h-9 flex-1 px-3 py-2 text-sm ${
                            /^\d+$/.test(draft.trim()) ? "numeric-value" : ""
                          }`}
                          placeholder="Type a message…"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          disabled={!activeId}
                        />
                        <button
                          type="submit"
                          disabled={!activeId || sending || !draft.trim()}
                          className="btn-primary h-9 shrink-0 px-4 py-2 text-sm"
                        >
                          Send
                        </button>
                      </form>
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DashboardShell>
  );
};

export default Messages;
