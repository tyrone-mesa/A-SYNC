// Helpers for resolving a company's logo.
//
// Background: logos used to be auto-fetched from https://logo.clearbit.com/<domain>
// (stored in `logoUrl`). Clearbit's free Logo API was permanently shut down on
// Dec 8, 2025, so those URLs will never load again. We now treat `logoUrl` as
// dead and only trust `companyUploadedLogo` (a real file the company uploaded
// through the app). If there's no uploaded logo, callers should fall back to
// an initials avatar (see CompanyLogo.jsx) instead of pointing at another
// external image API — that way there's nothing left that can go dark again.

import { resolveFileUrl } from "./fileUrl";

/**
 * Turns a stored logo path into a URL the browser can actually load.
 * Handles: already-absolute URLs, relative "/uploads/..." paths, and empty values.
 */
export function resolveCompanyLogoUrl(company) {
  return resolveFileUrl(company?.companyUploadedLogo) || null;
}

/** 1-2 letter initials for a company name, e.g. "Globe Telecom" -> "GT" */
export function getCompanyInitials(name) {
  if (!name) return "?";
  const words = name.replace(/[().,]/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// A small, pleasant palette so avatars don't clash with the app's green theme.
const PALETTE = [
  "#0b5d3d", "#1f6f8b", "#6a4c93", "#b5651d",
  "#2f6690", "#8d6a9f", "#3d7068", "#a24936",
];

/** Deterministic color per company name, so the same company always gets the same badge color. */
export function getCompanyAvatarColor(name) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
