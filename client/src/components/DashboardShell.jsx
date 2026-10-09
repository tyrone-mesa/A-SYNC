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
    { label: "Interview", to: "/student/interview" },
  ],
  company: [
    { label: "Dashboard", to: "/company/dashboard" },
    { label: "Company Profile", to: "/company/profile" },
    { label: "Job Postings", to: "/company/jobs" },
    { label: "Post Job", to: "/company/jobs/new" },
    { label: "Student Attendance", to: "/company/attendance" },
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
    { label: "Archive", to: "/admin/archive" },
    { label: "Security Audit", to: "/admin/security-audit" },
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

// Mount-in animations play only once per session. Every dashboard page shares
// this shell, and without this flag each route change remounts the shell and
// replays every fade — the source of the mobile glitch/flicker.
let dashboardShellHasAnimated = false;

const DashboardShell = ({
  role,
  title,
  subtitle,
  actions,
  children,
  compact = false,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentRole = role || user?.role || "student";
  const items = navMap[currentRole] || navMap.student;
  const mobileMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    window.location.replace("/");
  };

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

  const markShellAnimated = () => {
    dashboardShellHasAnimated = true;
  };

  return (
    <motion.div
      className="relative z-10 min-h-[calc(100vh-6rem)] overflow-x-hidden bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-6rem)]"
      initial={dashboardShellHasAnimated ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onAnimationComplete={markShellAnimated}
    >
      <div className="mx-auto flex min-h-full min-w-0 max-w-[1380px] flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
        <motion.aside
          className="hidden lg:flex lg:flex-col w-64 rounded-[20px] bg-gradient-to-b from-[rgba(33,76,63,0.82)] to-[rgba(33,76,63,0.68)] border border-[#214c3f]/50 shadow-[0_12px_40px_rgba(23,61,52,0.18)]"
          initial={dashboardShellHasAnimated ? false : { opacity: 0, x: -30 }}
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
            {items.map((item, idx) => {
              const active = isItemActive(item, location.pathname);

              return (
                <motion.div
                  key={item.to}
                  initial={dashboardShellHasAnimated ? false : { opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                >
                  <NavLink
                    to={item.to}
                    end={
                      item.to === "/company/jobs" ||
                      item.to === "/company/jobs/new"
                    }
                    className="group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300"
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId={`dashboard-nav-highlight-${currentRole}`}
                            className="absolute inset-0 rounded-lg bg-white/20 shadow-md ring-1 ring-white/30"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                              mass: 0.9,
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
                            className={`transition-all duration-300 flex-1 text-left ${
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

          <div className="border-t border-white/15 p-3">
            <motion.button
              type="button"
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              Log Out
            </motion.button>
          </div>
        </motion.aside>

        <motion.main
          className="glass-panel relative z-10 flex min-w-0 flex-1 flex-col overflow-x-hidden rounded-[22px] border border-white/25 bg-[rgba(255,255,255,0.16)] shadow-[0_20px_45px_rgba(15,30,53,0.10)]"
          initial={dashboardShellHasAnimated ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex min-w-0 flex-col gap-3 border-b border-white/15 bg-gradient-to-b from-[rgba(33,76,63,0.82)] to-[rgba(33,76,63,0.68)] px-3 py-3 text-white backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
              <div className="flex lg:hidden min-w-0 flex-1">
                <div
                  ref={mobileMenuRef}
                  className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {items.map((item) => {
                    const isActive = isItemActive(item, location.pathname);

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={
                          item.to === "/company/jobs" ||
                          item.to === "/company/jobs/new"
                        }
                        data-active={isActive}
                        aria-current={isActive ? "page" : undefined}
                        style={{ pointerEvents: "auto", cursor: "pointer" }}
                        className={({ isActive: linkActive }) =>
                          `relative shrink-0 snap-center whitespace-nowrap rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 ${
                            linkActive
                              ? "border border-[#d2e9e1]/50 bg-[#eaf3ee] text-[#173d34] shadow-[0_6px_18px_rgba(23,61,52,0.16),inset_0_1px_2px_rgba(255,255,255,0.35)]"
                              : "border border-transparent bg-white/10 text-white/80 hover:bg-white/[0.18]"
                          }`
                        }
                      >
                        {({ isActive: linkActive }) => (
                          <motion.span
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ y: -2 }}
                            transition={mobileNavTransition}
                            className="relative z-10 flex items-center gap-2"
                          >
                            {item.label}
                            {linkActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#173d34]" />
                            )}
                          </motion.span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <motion.div
                className="hidden lg:flex lg:items-start lg:gap-3"
                initial={dashboardShellHasAnimated ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div>
                  <motion.p
                    className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold"
                    initial={dashboardShellHasAnimated ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    {currentRole}
                  </motion.p>
                  <motion.h1
                    className="mt-1 font-display text-2xl font-bold tracking-tight text-white"
                    initial={dashboardShellHasAnimated ? false : { opacity: 0 }}
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
                  initial={dashboardShellHasAnimated ? false : { opacity: 0, scale: 0.9 }}
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
              initial={dashboardShellHasAnimated ? false : { opacity: 0 }}
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
                initial={dashboardShellHasAnimated ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              </motion.div>
            )}
          </header>

          <div className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:min-h-0 lg:overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="min-w-0"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                  duration: 0.25,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                {subtitle && (
                  <motion.p
                    className="mb-5 text-sm text-[#0F1E35]/70"
                    initial={dashboardShellHasAnimated ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {subtitle}
                  </motion.p>
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
    </motion.div>
  );
};

export default DashboardShell;
