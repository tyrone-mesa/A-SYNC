import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CHAT_THEMES, themeToStyle } from "../utils/chatTheme";

const PaletteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.4A3.6 3.6 0 0 0 21 11c0-4.4-4-8-9-8z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="10.5" cy="7" r="1" />
    <circle cx="15" cy="7.5" r="1" />
  </svg>
);

// Mini chat preview used inside each theme card.
const ThemePreview = ({ theme }) => (
  <div
    className="chat-themed flex h-20 w-full flex-col justify-center gap-1.5 overflow-hidden rounded-xl px-2"
    style={{
      ...themeToStyle(theme),
      ...(theme.previewSize
        ? { "--chat-pattern-size": theme.previewSize }
        : {}),
    }}
  >
    <span
      className="max-w-[70%] rounded-lg px-2 py-1 text-[9px] leading-none"
      style={{ background: theme.otherBg, color: theme.otherText }}
    >
      Hello!
    </span>
    <span
      className="ml-auto max-w-[70%] rounded-lg px-2 py-1 text-[9px] leading-none"
      style={{ background: theme.mineBg, color: theme.mineText }}
    >
      Hi, good day
    </span>
  </div>
);

// Palette button + theme sheet. `themeState` comes from useChatTheme().
const ChatThemePicker = ({ themeState, className = "" }) => {
  const [open, setOpen] = useState(false);
  const { themeId, setThemeId } = themeState;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const sheet = open ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chat theme"
      className="fixed inset-0 z-[2147483646] flex items-end justify-center bg-[#0F1E35]/60 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ height: "100dvh" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <div>
            <p className="text-base font-bold text-[#0F1E35]">Chat theme</p>
            <p className="text-xs text-[#0F1E35]/60">
              Only you see this. It won't change anyone else's chat.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close theme picker"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F0E9] text-lg font-bold text-[#17633e] transition hover:bg-[#d7e6da] active:scale-95"
          >
            ✕
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto px-5 pb-5 pt-2 sm:grid-cols-3">
          {CHAT_THEMES.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemeId(theme.id)}
                aria-pressed={active}
                className={`rounded-2xl border-2 p-1.5 text-left transition active:scale-[0.98] ${
                  active
                    ? "border-[#17633e] bg-[#E7F0E9]"
                    : "border-transparent bg-[#f4f7f5] hover:border-[#17633e]/30"
                }`}
              >
                <ThemePreview theme={theme} />
                <span className="mt-1.5 flex items-center justify-between px-1 text-xs font-semibold text-[#0F1E35]">
                  {theme.name}
                  {active && <span className="text-[#17633e]">✓</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="Change chat theme"
        title="Chat theme"
        onClick={() => setOpen(true)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[#17633e] transition hover:bg-[#E7F0E9] active:scale-95 ${className}`}
      >
        <PaletteIcon />
      </button>
      {sheet && typeof document !== "undefined"
        ? createPortal(sheet, document.body)
        : sheet}
    </>
  );
};

export default ChatThemePicker;
