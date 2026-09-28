import React, { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <motion.div className="min-h-[calc(100vh-6rem)] overflow-y-auto bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-6rem)] lg:overflow-hidden lg:px-8">
      <div className="mx-auto flex min-h-full min-w-0 max-w-[1380px] flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
        <motion.aside
          className={`${mobileMenuOpen ? "mobile-dashboard-drawer fixed inset-x-3 top-20 z-50 block max-h-[calc(100vh-6rem)] overflow-y-auto" : "hidden"} glass-sidebar w-full rounded-[28px] border border-white/20 p-5 shadow-[0_20px_45px_rgba(16,38,34,0.14)] lg:static lg:z-auto lg:block lg:h-full lg:max-h-none lg:w-[290px] lg:overflow-visible`}
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
                  onClick={() => setMobileMenuOpen(false)}
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
              className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/20 hover:border-white/30"
            >
              <span>Log Out</span>
            </button>
          </div>
        </motion.aside>

        {mobileMenuOpen && (
          <motion.button
            type="button"
            aria-label="Close dashboard menu"
            className="fixed inset-0 z-40 bg-[#0f3d2e]/55 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <motion.main className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-white/25 bg-[rgba(255,255,255,0.16)] shadow-[0_20px_45px_rgba(15,30,53,0.10)] backdrop-blur-xl sm:rounded-[28px]">
          <header className="flex min-w-0 flex-col gap-3 border-b border-white/15 bg-[rgba(33,76,63,0.74)] px-4 py-4 text-white backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label={
                    mobileMenuOpen
                      ? "Close dashboard menu"
                      : "Open dashboard menu"
                  }
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className="mt-0.5 flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
                >
                  <span className="h-0.5 w-4 rounded-full bg-current" />
                  <span className="h-0.5 w-4 rounded-full bg-current" />
                  <span className="h-0.5 w-4 rounded-full bg-current" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                    {currentRole}
                  </p>
                  <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                    {title}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              {user && (
                <div className="hidden rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white sm:block backdrop-blur-sm">
                  Hi,{" "}
                  <span className="font-semibold">
                    {user.fullName?.split(" ")[0] || "User"}
                  </span>
                </div>
              )}
              {actions && (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </header>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="min-w-0"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
    </motion.div>
  );
};

export default DashboardShell;
