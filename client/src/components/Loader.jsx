import React from "react";
import { motion } from "framer-motion";
import Logo from "./Logo";

// Brand-centric loader: a soft pulsing seal mark plus an indeterminate progress bar that
// sweeps left-to-right, in place of a generic spinner. The full-screen variant is a branded
// green splash screen (cream text); the inline variant sits on the page's light background
// (navy text).
const Loader = ({ fullScreen, label = "Loading…" }) => (
  <div
    className={
      fullScreen
        ? "min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#edf6f0_0%,_#dfeae3_22%,_#c8d7d1_44%,_#6a847e_70%,_#1f4d46_100%)]"
        : "flex items-center justify-center py-12"
    }
  >
    <div
      className={
        fullScreen
          ? "flex flex-col items-center gap-4 rounded-[28px] border border-white/25 bg-white/10 px-8 py-6 shadow-[0_20px_60px_rgba(11,93,61,0.18)] backdrop-blur-sm"
          : "flex flex-col items-center gap-4"
      }
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0.6 }}
        animate={{ scale: [0.92, 1.03, 0.96], opacity: [0.6, 1, 0.7] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        <Logo size={50} />
      </motion.div>
      <div
        className={`w-44 h-2 rounded-full overflow-hidden ${fullScreen ? "bg-[#dfeae3]/30 shadow-inner" : "bg-navy/10"}`}
      >
        <motion.div
          className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,#edf6f0_0%,#dfeecf_20%,#79a78c_45%,#1f4d46_100%)]"
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span
        className={`text-sm font-medium ${fullScreen ? "text-[#ebf6ef]" : "text-navy/65"}`}
      >
        {label}
      </span>
    </div>
  </div>
);

// Skeleton row(s), for list/card placeholders while data streams in — used in dashboards
// where a spinner would cause more layout shift than a shaped placeholder.
export const SkeletonRow = ({ className = "" }) => (
  <div className={`h-16 rounded-lg skeleton ${className}`} />
);

export default Loader;
