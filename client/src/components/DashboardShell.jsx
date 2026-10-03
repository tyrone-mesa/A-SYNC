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

  return (
    <motion.div className="min-h-[calc(100vh-6rem)] bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-6rem)] lg:min-h-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mx-auto flex min-h-full min-w-0 max-w-[1380px] flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
        {/* Desktop Sidebar - Hidden on Mobile */}
        <motion.aside
          className="hidden lg:block glass-sidebar w-64 rounded-[28px] border border-white/20 bg-[rgba(255,255,255,0.09)] shadow-[0_8px_32px_rgba(15,30,53,0.08)] backdrop-blur-xl"
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

          <div className="mt-5 space-y-2">
            {items.map((item) => {
              const active = isItemActive(item, location.pathname);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={
                    item.to === "/company/jobs" ||
                    item.to === "/company/jobs/new"
                  }
                  className={`group flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                    active
                      ? "relative text-[#173d34]"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={`dashboard-nav-highlight-${currentRole}`}
                      className="absolute inset-0 z-0 rounded-xl bg-[#eaf3ee] shadow-sm ring-1 ring-[#dfe9e3]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="mt-6 border-t border-white/15 pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/20 hover:text-white"
            >
              <span>Log Out</span>
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <motion.main className="glass-panel flex min-w-0 flex-1 flex-col overflow-visible rounded-[22px] border border-white/25 bg-[rgba(255,255,255,0.16)] shadow-[0_20px_45px_rgba(15,30,53,0.10)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile & Desktop Header */}
          <header className="flex min-w-0 flex-col gap-2 border-b border-white/15 bg-[rgba(33,76,63,0.74)] px-3 py-3 text-white backdrop-blur-md sm:px-4 sm:py-4">
            {/* Line 1: Horizontal Menu (Mobile Only) / User Info (Desktop) */}
            <div className="flex min-w-0 items-center justify-center gap-3 lg:justify-start">
              {/* Mobile: Horizontal Scrollable Menu */}
              <div className="flex lg:hidden min-w-0 flex-1">
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide pb-1"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {items.map((item) => {
                    const active = isItemActive(item, location.pathname);

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={
                          item.to === "/company/jobs" ||
                          item.to === "/company/jobs/new"
                        }
                        className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
                          active
                            ? "bg-[#eaf3ee] text-[#173d34] shadow-sm"
                            : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Title and Role */}
              <div className="hidden lg:flex lg:items-start lg:gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                    {currentRole}
                  </p>
                  <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                    {title}
                  </h1>
                </div>
              </div>

              {/* User Info - Center */}
              {user && (
                <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs sm:text-sm text-white backdrop-blur-sm whitespace-nowrap">
                  Hi,{" "}
                  <span className="font-semibold">
                    {user.fullName?.split(" ")[0] || "User"}
                  </span>
                </div>
              )}
            </div>

            {/* Line 2: Page Title & Breadcrumb (Mobile) */}
            <div className="flex lg:hidden min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-white/75 truncate">
                  {currentRole} {title && "•"} {title}
                </p>
              </div>
              {actions && (
                <div className="flex min-w-0 flex-wrap items-center gap-2 shrink-0">
                  {actions}
                </div>
              )}
            </div>

            {/* Desktop: Actions Row */}
            <div className="hidden lg:flex min-w-0 flex-wrap items-center gap-3">
              {actions && (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
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
                transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {subtitle && (
                  <p className="mb-5 text-sm text-[#0F1E35]/70">{subtitle}</p>
                )}
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.main>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
};

export default DashboardShell;
