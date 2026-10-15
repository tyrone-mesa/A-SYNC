import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const navMap = {
  student: [
    { label: "Dashboard", to: "/student/dashboard" },
    { label: "OJT Manual", to: "/student/ojt-manual" },
    { label: "Profile", to: "/student/profile" },
    { label: "Applications", to: "/student/applications" },
    { label: "Messages", to: "/messages" },
    { label: "Interview Simulator", to: "/student/interview" },
    { label: "Interview", to: "/student/interviews" },
    { label: "Journal", to: "/student/journal" },
    { label: "Evaluation", to: "/student/evaluation" },
  ],
  company: [
    { label: "Dashboard", to: "/company/dashboard" },
    { label: "Company Profile", to: "/company/profile" },
    { label: "Job Postings", to: "/company/jobs" },
    { label: "Post Job", to: "/company/jobs/new" },
    { label: "Student Attendance", to: "/company/attendance" },
    { label: "Evaluations", to: "/company/evaluations" },
    { label: "Messages", to: "/messages" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Messages", to: "/messages" },
    { label: "Students", to: "/admin/students" },
    { label: "Companies", to: "/admin/companies" },
    { label: "Coordinators", to: "/admin/coordinators" },
    { label: "Registrars", to: "/admin/registrars" },
    { label: "Users", to: "/admin/users" },
    { label: "Admins", to: "/admin/admins", adminOnly: true },
    { label: "Archive", to: "/admin/archive", adminOnly: true },
    { label: "Security Audit", to: "/admin/security-audit", adminOnly: true },
    { label: "Reports", to: "/admin/reports" },
  ],
  coordinator: [
    { label: "Dashboard", to: "/coordinator/dashboard" },
    { label: "Students", to: "/coordinator/students" },
    { label: "Messages", to: "/messages" },
  ],
  registrar: [
    { label: "Dashboard", to: "/registrar/dashboard" },
    { label: "Student Records", to: "/registrar/students" },
    { label: "Messages", to: "/messages" },
  ],
};

const animationVariants = {
  navItem: {
    inactive: { opacity: 0.75 },
    active: { opacity: 1 },
  },
};

const mobileNavTransition = {
  type: "spring",
  stiffness: 320,
  damping: 24,
  mass: 0.8,
};

// FIX 3: Persist the "already animated" flag in sessionStorage instead of a
// module-level variable. A module-level `let` resets on every full page load
// (login redirect, refresh, logout -> window.location.replace), which replayed
// the entire sidebar cascade (aside slide + per-item stagger) on the first
// dashboard view of every session for every user.
const SHELL_ANIMATED_KEY = "dashboardShellHasAnimated";

const hasShellAnimated = () => {
  try {
    return sessionStorage.getItem(SHELL_ANIMATED_KEY) === "1";
  } catch {
    return false;
  }
};

const markShellAnimated = () => {
  try {
    sessionStorage.setItem(SHELL_ANIMATED_KEY, "1");
  } catch {
    // Storage unavailable (private mode, etc.) — animations simply replay.
  }
};


// Mobile tab-bar icons (inline 24px stroke set - no icon dependency).
const TAB_ICONS = {
  dashboard:
    "M3.5 11.5 12 4l8.5 7.5 M5.5 9.8V20h4.6v-5h3.8v5h4.6V9.8",
  messages: "M4.5 5h15v9.5H9.8L4.5 19z",
  students:
    "M12 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M5 19.5c.6-3.2 3-4.8 7-4.8s6.4 1.6 7 4.8",
  companies:
    "M5 20.5V5.5l7-1.8v16.8 M12 20.5h7V9.5h-7 M8 8.5h1.6 M8 12h1.6 M8 15.5h1.6 M15 13h1.4 M15 16.5h1.4",
  coordinators:
    "M8.5 10.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z M3 19.5c.5-2.8 2.5-4.2 5.5-4.2s5 1.4 5.5 4.2 M16 10.4a2.4 2.4 0 1 0-1.4-4.3 M15.6 15.4c2.5.2 4.2 1.4 4.9 4.1",
  registrars:
    "M8.5 10.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z M3 19.5c.5-2.8 2.5-4.2 5.5-4.2s5 1.4 5.5 4.2 M16 10.4a2.4 2.4 0 1 0-1.4-4.3 M15.6 15.4c2.5.2 4.2 1.4 4.9 4.1",
  users:
    "M8.5 10.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z M3 19.5c.5-2.8 2.5-4.2 5.5-4.2s5 1.4 5.5 4.2 M16 10.4a2.4 2.4 0 1 0-1.4-4.3 M15.6 15.4c2.5.2 4.2 1.4 4.9 4.1",
  admins:
    "M12 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M5 19.5c.6-3.2 3-4.8 7-4.8s6.4 1.6 7 4.8",
  archive:
    "M4.5 4.5h15v4.5h-15z M5.5 9v10.5h13V9 M10 13h4",
  security:
    "M12 3.5l7 2.8v5.2c0 4.4-2.9 7.3-7 8.9-4.1-1.6-7-4.5-7-8.9V6.3z M9.2 11.6l2 2 3.8-3.8",
  reports: "M4.5 19.5h15 M7 19.5v-5.5 M12 19.5V5.5 M17 19.5v-8.5",
  manual:
    "M5 5.2c2-1 4.4-1 7 .4 2.6-1.4 5-1.4 7-.4V18.6c-2-1-4.4-1-7 .5-2.6-1.5-5-1.5-7-.5z M12 5.6v13.4",
  profile:
    "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 12.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z M6.3 18.6c1-2.7 3.1-4 5.7-4s4.7 1.3 5.7 4",
  applications:
    "M6.5 3.5h7.5l3.5 3.5v13.5h-11z M14 3.5V7h3.5 M9.3 12h5.4 M9.3 15.5h5.4",
  interview: "M4.5 6h15 M4.5 6v13h15V6 M8.5 3.5V7 M15.5 3.5V7 M9.3 13.4l2 2 3.6-3.6",
  interviews: "M4.5 6h15 M4.5 6v13h15V6 M8.5 3.5V7 M15.5 3.5V7 M9.3 13.4l2 2 3.6-3.6",
  simulator: "M12 4.2l1.7 4.3 4.6 1.4-4.6 1.4L12 15.6l-1.7-4.3-4.6-1.4 4.6-1.4z",
  journal:
    "M12 6.2c-2-1.4-4.5-1.8-7-1.5V18.4c2.5-.3 5 .1 7 1.5 2-1.4 4.5-1.8 7-1.5V4.7c-2.5-.3-5 .1-7 1.5z M12 6.2v13.6",
  evaluation: "M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5z M9 4.5V8h6V4.5 M9.2 13.4l2 2 3.6-3.6",
  jobs: "M4 8.5h16v10H4z M9 8.5V6.6A1.1 1.1 0 0 1 10.1 5.5h3.8A1.1 1.1 0 0 1 15 6.6v1.9 M4 12.8h16",
  attendance: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 7.5V12l3.2 2.1",
  applicants:
    "M8.5 10.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z M3 19.5c.5-2.8 2.5-4.2 5.5-4.2s5 1.4 5.5 4.2 M16 10.4a2.4 2.4 0 1 0-1.4-4.3 M15.6 15.4c2.5.2 4.2 1.4 4.9 4.1",
  ojtmanual:
    "M5 5.2c2-1 4.4-1 7 .4 2.6-1.4 5-1.4 7-.4V18.6c-2-1-4.4-1-7 .5-2.6-1.5-5-1.5-7-.5z M12 5.6v13.4",
};

const iconFor = (label) => {
  const key = label.toLowerCase();
  for (const name of Object.keys(TAB_ICONS)) {
    if (key.includes(name)) return TAB_ICONS[name];
  }
  return TAB_ICONS.dashboard;
};

const TabIcon = ({ label, active }) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={iconFor(label)} />
  </svg>
);

const DashboardShell = ({
  role,
  title,
  subtitle,
  actions,
  children,
  compact = false,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const currentRole = role || user?.role || "student";
  const items = navMap[currentRole] || navMap.student;
  const mobileMenuRef = useRef(null);


  const isItemActive = (item, pathname) => {
    if (item.to === "/messages") {
      return pathname === "/messages";
    }

    if (item.to === "/company/jobs") {
      return (
        pathname === "/company/jobs" ||
        (/^\/company\/jobs\/(?!new$)/.test(pathname) &&
          !pathname.startsWith("/company/jobs/new"))
      );
    }

    if (item.to === "/company/jobs/new") {
      return pathname === "/company/jobs/new";
    }

    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  };

  useEffect(() => {
    const activeButton = mobileMenuRef.current?.querySelector("[data-active='true']");
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [location.pathname]);

  return (
    <motion.div
      className="relative z-10 min-h-[calc(100vh-6rem)] overflow-x-hidden bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-6rem)]"
      initial={hasShellAnimated() ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onAnimationComplete={markShellAnimated}
    >
      <div className="mx-auto flex min-h-full min-w-0 max-w-[1380px] flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
        <motion.aside
          className="hidden lg:flex lg:flex-col w-64 rounded-[20px] bg-gradient-to-b from-[rgba(33,76,63,0.82)] to-[rgba(33,76,63,0.68)] border border-[#214c3f]/50 shadow-[0_12px_40px_rgba(23,61,52,0.18)]"
          initial={hasShellAnimated() ? false : { opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/15">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30 shadow-sm">
                <Logo size={24} />
              </div>
              <div className="text-left">
                <p className="font-display text-base font-bold tracking-tight text-white leading-none">
                  ASIATECH<br /><span className="text-[#b8e6d5] text-sm">SYNC</span>
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
            {items.filter((i) => !i.adminOnly || user?.adminType !== "read-only").map((item, idx) => {
              const active = isItemActive(item, location.pathname);

              return (
                <motion.div
                  key={item.to}
                  initial={hasShellAnimated() ? false : { opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <NavLink
                    to={item.to}
                    end={
                      item.to === "/company/jobs" ||
                      item.to === "/company/jobs/new"
                    }
                    className="group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-300"
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId={`dashboard-nav-highlight-${currentRole}`}
                            className="absolute inset-0 rounded-lg bg-white/20 shadow-md ring-1 ring-white/30"
                            transition={{
                              type: "spring",
                              stiffness: 650,
                              damping: 42,
                              mass: 0.6,
                            }}
                          />
                        )}

                        <motion.span
                          className="relative z-10 flex items-center gap-2.5 w-full"
                          animate={isActive ? "active" : "inactive"}
                          variants={animationVariants.navItem}
                          transition={{ duration: 0.2 }}
                        >
                          {isActive && (
                            <motion.div
                              className="h-1 w-1 rounded-full bg-[#7fffcf] flex-shrink-0"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 20,
                              }}
                            />
                          )}
                          <span
                            className={`transition-colors duration-300 flex-1 text-left ${
                              isActive
                                ? "text-white font-semibold"
                                : "text-white/70 group-hover:text-white/90"
                            }`}
                          >
                            {item.label}
                          </span>
                        </motion.span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </nav>
        </motion.aside>

        <motion.main
          className="glass-panel relative z-10 flex min-w-0 flex-1 flex-col overflow-x-hidden rounded-[22px] border border-white/25 bg-[rgba(255,255,255,0.16)] shadow-[0_20px_45px_rgba(15,30,53,0.10)]"
          initial={hasShellAnimated() ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex min-w-0 flex-col gap-3 border-b border-white/15 bg-gradient-to-b from-[rgba(33,76,63,0.82)] to-[rgba(33,76,63,0.68)] px-3 py-3 text-white backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">

              <motion.div
                className="hidden lg:flex lg:items-start lg:gap-3"
                initial={hasShellAnimated() ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div>
                  <motion.p
                    className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold"
                    initial={hasShellAnimated() ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    {currentRole}
                  </motion.p>
                  <motion.h1
                    className="mt-1 font-display text-2xl font-bold tracking-tight text-white"
                    initial={hasShellAnimated() ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {title}
                  </motion.h1>
                </div>
              </motion.div>

              {user && (
                <motion.div
                  className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs sm:text-sm text-white backdrop-blur-sm whitespace-nowrap shadow-sm"
                  initial={hasShellAnimated() ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.25,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  Hi,{" "}
                  <span className="font-semibold text-white">
                    {user.fullName?.split(" ")[0] || "User"}
                  </span>
                </motion.div>
              )}
            </div>

            <motion.div
              className="flex lg:hidden min-w-0 items-center justify-between gap-2"
              initial={hasShellAnimated() ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60 truncate font-semibold">
                  {currentRole} {title && "•"} {title}
                </p>
              </div>
              {actions && (
                <div className="flex min-w-0 flex-wrap items-center gap-2 shrink-0">
                  {actions}
                </div>
              )}
            </motion.div>

            {actions && (
              <motion.div
                className="hidden lg:flex min-w-0 flex-wrap items-center gap-3"
                initial={hasShellAnimated() ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              </motion.div>
            )}
          </header>

          <div className="min-w-0 flex-1 px-3 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-28 lg:pb-6 lg:min-h-0 lg:overflow-y-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={location.pathname}
                className="min-w-0"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {subtitle && (
                  <motion.p
                    className="mb-5 text-sm text-[#0F1E35]/70"
                    initial={hasShellAnimated() ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {subtitle}
                  </motion.p>
                )}
                {user?.role === "admin" && user?.adminType === "read-only" && (
                  <p className="mb-8 px-1 text-sm font-medium text-[#0b5d3d]">
                    Read-only admin — you can view everything and use messages,
                    but adding, editing, and deleting accounts is disabled.
                  </p>
                )}
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.main>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @supports (scroll-behavior: smooth) {
          .scroll-smooth {
            scroll-behavior: smooth;
          }
        }

        button:focus-visible,
        a:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* Mobile app tab bar - native-app navigation on small screens. */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white/60 bg-white px-1.5 pt-2 shadow-[0_10px_30px_rgba(15,30,53,0.28)] scrollbar-hide lg:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-stretch gap-0.5 overflow-x-auto scrollbar-hide">
          {items
            .filter(
              (item) => !item.adminOnly || user?.adminType !== "read-only",
            )
            .map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-[9.5px] font-semibold leading-none transition-colors ${
                    active
                      ? "bg-[#E7F0E9] text-[#17633e]"
                      : "text-[#0F1E35]/55"
                  }`}
                >
                  <TabIcon label={item.label} active={active} />
                  <span className="max-w-[64px] truncate">{item.label}</span>
                  <span
                    className={`h-1 w-1 rounded-full ${
                      active ? "bg-[#17633e]" : "bg-transparent"
                    }`}
                  />
                </NavLink>
              );
            })}
        </div>
      </nav>
    </motion.div>
  );
};

export default DashboardShell;
