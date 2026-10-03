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

// Animation variants for consistent motion
const animationVariants = {
  navItem: {
    inactive: { scale: 1, opacity: 0.7 },
    active: { scale: 1, opacity: 1 },
    hover: { scale: 1.02, opacity: 1 },
  },
  tabIndicator: {
    initial: { scaleX: 0, opacity: 0 },
    animate: { scaleX: 1, opacity: 1 },
    exit: { scaleX: 0, opacity: 0 },
  },
};

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

  // Auto-scroll active mobile tab into view
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
      className="min-h-[calc(100vh-6rem)] bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-6rem)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mx-auto flex min-h-full min-w-0 max-w-[1380px] flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
        {/* Desktop Sidebar - Hidden on Mobile */}
        <motion.aside
          className="hidden lg:block glass-sidebar w-64 rounded-[28px] border border-white/20 bg-[rgba(255,255,255,0.09)] shadow-[0_8px_32px_rgba(15,30,53,0.08)] backdrop-blur-xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between px-2 pb-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <Logo size={24} />
              </div>
              <div className="text-left">
                <p className="font-display text-lg font-bold tracking-tight text-white">
                  ASIATECH <span className="text-[#c4e1c1]">SYNC</span>
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 space-y-1.5 px-2">
            {items.map((item, idx) => {
              const active = isItemActive(item, location.pathname);

              return (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <NavLink
                    to={item.to}
                    end={
                      item.to === "/company/jobs" ||
                      item.to === "/company/jobs/new"
                    }
                    className={`group relative flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-300`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId={`dashboard-nav-highlight-${currentRole}`}
                            className="absolute inset-0 z-0 rounded-xl bg-gradient-to-r from-[#e8f1ed] to-[#eaf3ee] shadow-md ring-1 ring-[#dfe9e3]/50"
                            transition={{
                              type: "spring",
                              stiffness: 350,
                              damping: 28,
                              mass: 0.8,
                            }}
                          />
                        )}
                        <motion.span
                          className="relative z-10 flex items-center gap-3"
                          animate={isActive ? "active" : "inactive"}
                          variants={animationVariants.navItem}
                          transition={{ duration: 0.25 }}
                        >
                          <span
                            className={`text-base transition-colors duration-300 ${
                              isActive ? "text-[#173d34]" : "text-white/60 group-hover:text-white/90"
                            }`}
                          >
                            {item.label}
                          </span>
                        </motion.span>
                        {isActive && (
                          <motion.div
                            className="relative z-10 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#173d34] to-[#1a5b44]"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/15 p-2 pt-4">
            <motion.button
              type="button"
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/30 active:bg-white/15"
            >
              Log Out
            </motion.button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <motion.main
          className="glass-panel flex min-w-0 flex-1 flex-col overflow-visible rounded-[22px] border border-white/25 bg-[rgba(255,255,255,0.16)] shadow-[0_20px_45px_rgba(15,30,53,0.10)]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile & Desktop Header */}
          <header className="flex min-w-0 flex-col gap-3 border-b border-white/15 bg-gradient-to-b from-[rgba(33,76,63,0.82)] to-[rgba(33,76,63,0.68)] px-3 py-3 text-white backdrop-blur-md sm:px-4 sm:py-4 shadow-sm">
            {/* Line 1: Horizontal Menu (Mobile Only) / User Info (Desktop) */}
            <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
              {/* Mobile: Horizontal Scrollable Menu with Smooth Animation */}
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
                        className="shrink-0 snap-center"
                        data-active={isActive}
                      >
                        {({ isActive: linkActive }) => (
                          <motion.div
                            initial={false}
                            animate={{
                              backgroundColor: linkActive
                                ? "rgba(234, 243, 238, 1)"
                                : "rgba(255, 255, 255, 0.1)",
                              color: linkActive
                                ? "rgba(23, 61, 52, 1)"
                                : "rgba(255, 255, 255, 0.75)",
                              boxShadow: linkActive
                                ? "0 4px 12px rgba(23, 61, 52, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.3)"
                                : "none",
                            }}
                            whileHover={{
                              backgroundColor: linkActive
                                ? "rgba(234, 243, 238, 1)"
                                : "rgba(255, 255, 255, 0.18)",
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.96,
                            }}
                            transition={{
                              duration: 0.35,
                              ease: [0.34, 1.56, 0.64, 1],
                            }}
                            className="relative whitespace-nowrap rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[rgba(33,76,63,0.74)]"
                            style={{
                              border: linkActive
                                ? "1px solid rgba(210, 233, 225, 0.5)"
                                : "1px solid transparent",
                              transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {item.label}
                              {linkActive && (
                                <motion.span
                                  className="h-1.5 w-1.5 rounded-full bg-[#173d34]"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25,
                                  }}
                                />
                              )}
                            </span>
                          </motion.div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Title and Role */}
              <motion.div
                className="hidden lg:flex lg:items-start lg:gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div>
                  <motion.p
                    className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    {currentRole}
                  </motion.p>
                  <motion.h1
                    className="mt-1 font-display text-2xl font-bold tracking-tight text-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {title}
                  </motion.h1>
                </div>
              </motion.div>

              {/* User Info Pill */}
              {user && (
                <motion.div
                  className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs sm:text-sm text-white backdrop-blur-sm whitespace-nowrap shadow-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
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

            {/* Line 2: Page Title & Breadcrumb (Mobile) */}
            <motion.div
              className="flex lg:hidden min-w-0 items-center justify-between gap-2"
              initial={{ opacity: 0 }}
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

            {/* Desktop: Actions Row */}
            {actions && (
              <motion.div
                className="hidden lg:flex min-w-0 flex-wrap items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              </motion.div>
            )}
          </header>

          {/* Page Content */}
          <div className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:min-h-0 lg:overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="min-w-0"
                initial={{ opacity: 0, y: 4 }}
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
                    initial={{ opacity: 0 }}
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

      {/* Global Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Smooth scroll behavior for mobile menu */
        @supports (scroll-behavior: smooth) {
          .scroll-smooth {
            scroll-behavior: smooth;
          }
        }

        /* Focus visible styles for accessibility */
        button:focus-visible,
        a:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: 2px;
        }

        /* Reduced motion support */
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
