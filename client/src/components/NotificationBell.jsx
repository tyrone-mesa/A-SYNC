import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/axios";
import { connectNotificationSocket } from "../utils/socket";

const POLL_INTERVAL_MS = 30000;
const TOAST_DURATION_MS = 6000;

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Rendered in the Navbar for authenticated users. No icon library is installed in
// this project, so the bell is a small inline SVG to match how the mobile menu icon in
// Navbar.jsx is already done.
const NotificationBell = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [toast, setToast] = useState(null);

  // Real-time push: the server emits every new notification the moment it is
  // created (server/utils/socket.js). The polling below stays as a fallback
  // for when the socket is disconnected or unsupported.
  useEffect(() => {
    const socket = connectNotificationSocket((payload) => {
      const notification = payload && payload.notification;
      if (!notification) return;
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      setToast(notification);
    });
    return () => {
      if (socket) socket.off("notification:new");
    };
  }, []);

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let requestInFlight = false;
    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        requestInFlight
      ) return;
      requestInFlight = true;
      api
        .get("/notifications/unread-count")
        .then(({ data }) => setUnreadCount(data.count))
        .catch(() => {})
        .finally(() => {
          requestInFlight = false;
        });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoadingNotifications(true);
      api
        .get("/notifications")
        .then(({ data }) => {
          setNotifications(data.notifications || []);
        })
        .catch(() => setNotifications([]))
        .finally(() => setLoadingNotifications(false));
    }
  };

  const handleSelect = async (notification) => {
    setOpen(false);
    if (!notification.read) {
      setUnreadCount((c) => Math.max(c - 1, 0));
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n,
        ),
      );
      api.put(`/notifications/${notification._id}/read`).catch(() => {});
    }
    if (notification.link) navigate(notification.link);
  };

  // Tapping the toast acts exactly like selecting the same notification in
  // the dropdown: mark it read, then follow its link if it has one.
  const handleToastOpen = () => {
    if (!toast) return;
    const notification = toast;
    setToast(null);
    if (!notification.read) {
      setUnreadCount((c) => Math.max(c - 1, 0));
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n,
        ),
      );
      api.put(`/notifications/${notification._id}/read`).catch(() => {});
    }
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.put("/notifications/read-all").catch(() => {});
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative text-cream/85 hover:text-gold transition p-1.5"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-coral text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-black/10 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
            <span className="font-display font-semibold text-navy text-sm">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-gold font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {loadingNotifications ? (
            <p className="text-navy/65 text-sm text-center py-8 px-4">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-navy/65 text-sm text-center py-8 px-4">
              No notifications yet.
            </p>
          ) : (
            <div className="divide-y divide-black/5">
              {notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleSelect(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-navy/5 transition ${
                    n.read ? "" : "bg-gold/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                    )}
                    <div className={n.read ? "ml-3.5" : ""}>
                      <p className="text-navy text-sm font-medium leading-snug">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-navy/65 text-xs mt-0.5 leading-snug">
                          {n.body}
                        </p>
                      )}
                      <p className="text-navy/65 text-[11px] mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real-time toast: anchored to the bell so a new Socket.IO notification
          pops out of the bell itself instead of the far bottom-right corner of
          the screen. Styled with the same palette as the dropdown (white card,
          navy text, gold accent) so it stays on theme.

          Responsive reference (most common viewports, big to small):
            - Desktop 16:9 / 16:10 / 21:9: 1920x1080, 1536x864, 1366x768
            - Tablet 4:3 / 16:10: 768x1024, 1280x800
            - Mobile 19.5:9 / 20:9: 390x844, 360x800, down to 320px wide
          The card hangs from the bell's right edge (which always sits near the
          right side of the navbar) and its width is capped at the viewport
          minus a safety margin, so it never overflows on any screen size:
          320px-wide phones included. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full mt-2 z-[200] w-72 sm:w-80 max-w-[calc(100vw-2rem)]"
          >
            {/* Caret pointing up at the bell, so the toast visually pops out
                of it. Sits above the card edge; the rotation makes a diamond
                whose top half reads as an arrow. */}
            <span className="absolute -top-1.5 right-3 w-3 h-3 rotate-45 bg-white border-l border-t border-black/10" />
            <div className="bg-white rounded-xl shadow-xl border border-black/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                <button
                  type="button"
                  onClick={handleToastOpen}
                  className="flex-1 text-left"
                >
                  <p className="text-navy text-sm font-semibold leading-snug">
                    {toast.title}
                  </p>
                  {toast.body && (
                    <p className="text-navy/65 text-xs mt-0.5 leading-snug">
                      {toast.body}
                    </p>
                  )}
                  {toast.link && (
                    <p className="text-gold text-[11px] font-medium mt-1">
                      Tap to view
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  aria-label="Dismiss notification"
                  className="text-navy/40 hover:text-navy transition p-0.5 shrink-0"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
