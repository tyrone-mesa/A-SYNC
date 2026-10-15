import { useCallback, useEffect, useMemo, useState } from "react";

// Personal chat themes (Telegram style): each person picks their own look for
// the message background and bubbles. The choice is saved on this device,
// per account, and is never shown to the other person in the conversation.

// A-Sync design language: thin-line school/office icons (paperclip, pencil,
// note, paper, laptop, graduation cap) plus small dots, ruled and graph paper,
// all drawn in the logo's deep-teal and mint tones.
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const ICONS = {
  clip: "<path d='M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'/>",
  pencil: "<path d='M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'/><path d='M14.5 5.5l4 4'/>",
  note: "<path d='M4 3h16v12l-6 6H4z'/><path d='M14 21v-6h6'/><path d='M8 8h8M8 12h5'/>",
  paper: "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6M8 13h8M8 17h6'/>",
  laptop: "<rect x='4' y='5' width='16' height='11' rx='1.5'/><path d='M2 19.5h20'/>",
  cap: "<path d='M12 4L2 9l10 5 10-5-10-5z'/><path d='M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6'/>",
};

// [icon, x, y, rotation, scale] laid out inside a 192px tile (no edge cuts).
const ICON_LAYOUT = [
  ["clip", 12, 12, 20, 1],
  ["cap", 78, 8, -8, 1.15],
  ["pencil", 146, 16, 18, 1],
  ["laptop", 30, 64, -6, 1.15],
  ["note", 104, 60, 10, 1.1],
  ["paper", 156, 92, -12, 1],
  ["pencil", 10, 122, -32, 1],
  ["paper", 62, 130, 8, 1],
  ["note", 118, 138, -10, 1],
  ["cap", 156, 142, 12, 0.95],
  ["clip", 84, 100, -25, 0.9],
];
const DOT_LAYOUT = [
  [60, 40, 2.2], [140, 52, 1.6], [24, 104, 2], [98, 176, 1.8],
  [182, 66, 1.6], [48, 176, 2], [150, 182, 1.5], [180, 126, 1.6], [44, 28, 1.4],
];

const iconPattern = (stroke, dot) =>
  svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192' fill='none' stroke='${stroke}' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'>${ICON_LAYOUT.map(
      ([name, x, y, rot, sc]) =>
        `<g transform='translate(${x} ${y}) rotate(${rot} 12 12) scale(${sc})'>${ICONS[name]}</g>`,
    ).join("")}${DOT_LAYOUT.map(
      ([x, y, r]) => `<circle cx='${x}' cy='${y}' r='${r}' fill='${dot}' stroke='none'/>`,
    ).join("")}<circle cx='92' cy='150' r='3' stroke='${stroke}'/></svg>`,
  );

const ICONS_LIGHT = iconPattern("rgba(55,99,96,0.3)", "rgba(110,190,160,0.5)");
const ICONS_DARK = iconPattern("rgba(190,235,215,0.2)", "rgba(168,220,196,0.32)");

// Ruled notebook paper (with a soft left margin line) and graph paper.
const RULED = [
  svgUrl(
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='30'><path d='M0 29.5H40' stroke='rgba(55,99,96,0.17)' stroke-width='1'/></svg>",
  ),
  "linear-gradient(90deg, transparent 38px, rgba(231,110,100,0.22) 38px, rgba(231,110,100,0.22) 39px, transparent 39px)",
].join(", ");
const GRAPH = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M24 0V24H0' fill='none' stroke='rgba(55,99,96,0.14)' stroke-width='1'/></svg>",
);
const DOTS = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><circle cx='7' cy='7' r='1.6' fill='rgba(55,99,96,0.2)'/><circle cx='21' cy='21' r='1.6' fill='rgba(110,190,160,0.35)'/></svg>",
);

const TEAL = "#376360";

export const CHAT_THEMES = [
  {
    id: "default",
    name: "Classic",
    bg: "#f8faf8",
    mineBg: "#dfeecf",
    mineText: "#0F1E35",
    otherBg: "#ffffff",
    otherText: "#0F1E35",
    meta: "rgba(15,30,53,0.65)",
  },
  {
    id: "async-icons",
    name: "A-Sync Icons",
    bg: "#eaf5ec",
    pattern: ICONS_LIGHT,
    previewSize: "110px",
    mineBg: TEAL,
    mineText: "#ffffff",
    otherBg: "#ffffff",
    otherText: "#0F1E35",
    meta: "rgba(15,30,53,0.6)",
    mineMeta: "rgba(255,255,255,0.72)",
  },
  {
    id: "async-icons-night",
    name: "A-Sync Night",
    bg: "#2b4c4a",
    pattern: ICONS_DARK,
    previewSize: "110px",
    mineBg: "#a8dcc4",
    mineText: "#0F1E35",
    otherBg: "#3a6360",
    otherText: "#f2faf6",
    meta: "rgba(242,250,246,0.62)",
    mineMeta: "rgba(15,30,53,0.62)",
  },
  {
    id: "ruled-paper",
    name: "Ruled Paper",
    bg: "#fbfdf2",
    pattern: RULED,
    mineBg: "#cdeede",
    mineText: "#0F1E35",
    otherBg: "#ffffff",
    otherText: "#0F1E35",
    meta: "rgba(15,30,53,0.6)",
  },
  {
    id: "graph-paper",
    name: "Graph Paper",
    bg: "#f3faf1",
    pattern: GRAPH,
    mineBg: TEAL,
    mineText: "#ffffff",
    otherBg: "#ffffff",
    otherText: "#0F1E35",
    meta: "rgba(15,30,53,0.6)",
    mineMeta: "rgba(255,255,255,0.72)",
  },
  {
    id: "mint-dots",
    name: "Mint Dots",
    bg: "#eaf3ee",
    pattern: DOTS,
    mineBg: "#bfe0c9",
    mineText: "#0F1E35",
    otherBg: "#ffffff",
    otherText: "#0F1E35",
    meta: "rgba(15,30,53,0.6)",
  },
  {
    id: "asiatech-green",
    name: "Asiatech Green",
    bg: "#E7F0E9",
    mineBg: "#17633e",
    mineText: "#ffffff",
    otherBg: "#ffffff",
    otherText: "#0F1E35",
    meta: "rgba(15,30,53,0.6)",
    mineMeta: "rgba(255,255,255,0.7)",
  },
  {
    id: "midnight",
    name: "Midnight Navy",
    bg: "#0F1E35",
    mineBg: "#2f8f5b",
    mineText: "#ffffff",
    otherBg: "#1d3050",
    otherText: "#f2f6fb",
    meta: "rgba(242,246,251,0.6)",
    mineMeta: "rgba(255,255,255,0.75)",
  },
];

const STORAGE_PREFIX = "asiatech-chat-theme:";
const CHANGE_EVENT = "asiatech-chat-theme-change";

const storageKey = (userId) => `${STORAGE_PREFIX}${userId || "guest"}`;

const readThemeId = (userId) => {
  try {
    const saved = window.localStorage.getItem(storageKey(userId));
    return CHAT_THEMES.some((t) => t.id === saved) ? saved : "default";
  } catch {
    return "default";
  }
};

export const getTheme = (id) =>
  CHAT_THEMES.find((t) => t.id === id) || CHAT_THEMES[0];

// CSS variables consumed by .chat-themed / .chat-bubble in index.css.
export const themeToStyle = (theme) => {
  const isGradient = String(theme.bg).startsWith("linear-gradient");
  return {
  "--chat-bg": isGradient ? "transparent" : theme.bg,
  "--chat-pattern": theme.pattern || (isGradient ? theme.bg : "none"),
  "--chat-pattern-size": "auto",
  "--chat-mine-bg": theme.mineBg,
  "--chat-mine-text": theme.mineText,
  "--chat-other-bg": theme.otherBg,
  "--chat-other-text": theme.otherText,
  "--chat-meta": theme.meta,
  "--chat-mine-meta": theme.mineMeta || theme.meta,
  };
};

export function useChatTheme(userId) {
  const [themeId, setThemeIdState] = useState(() => readThemeId(userId));

  useEffect(() => {
    setThemeIdState(readThemeId(userId));
  }, [userId]);

  // Keep the inbox page and the floating chat in sync (and other tabs too).
  useEffect(() => {
    const onChange = (event) => {
      if (event.detail?.userId === (userId || "guest")) {
        setThemeIdState(event.detail.id);
      }
    };
    const onStorage = (event) => {
      if (event.key === storageKey(userId)) setThemeIdState(readThemeId(userId));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  const setThemeId = useCallback(
    (id) => {
      try {
        window.localStorage.setItem(storageKey(userId), id);
      } catch {
        /* storage unavailable - theme still applies for this session */
      }
      setThemeIdState(id);
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, {
          detail: { userId: userId || "guest", id },
        }),
      );
    },
    [userId],
  );

  const theme = getTheme(themeId);
  const style = useMemo(() => themeToStyle(theme), [theme]);

  return { theme, themeId, setThemeId, style };
}
