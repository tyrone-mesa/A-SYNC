import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import { ChevronDown } from "lucide-react";

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

// Animation variants for smooth transitions
const animationVariants = {
  navItem: {
    inactive: { opacity: 0.75 },
    active: { opacity: 1 },
  },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scaleY: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    transition: {
      duration: 0.15,
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scaleY: 0.95,
    transition: {
      duration: 0.1,
      ease: [0.34, 1.56, 0.64, 1],
    },
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
  const navigate = useNavigate();
  const currentRole = role || user?.role || "student";
  const items = navMap[currentRole] || navMap.student;
  const mobileMenuRef = useRef(null);
  const [homeDropdownOpen, setHomeDropdownOpen] = useState(false);
  const homeDropdownRef = useRef(null);

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

  const handleHomeDropdownItemClick = (href) => {
    setHomeDropdownOpen(false);
    if (href.startsWith("#")) {
      // For hash links to landing page sections
      window.location.href = "/" + href;
    } else {
      navigate(href);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        homeDropdownRef.current &&
        !homeDropdownRef.current.contains(event.target)
      ) {
        setHomeDropdownOpen(false);
      }
    };

    if (homeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [homeDropdownOpen]);

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
        {/* Desktop Sidebar - Desktop Only */}
        <motion.aside
          className="hidden lg:flex lg:flex-col w-64 rounded-[20px] bg-gradient-to-b from-[#5a8c7e] via-[#4a7d72] to-[#3a6e66] border border-[#4a8876]/40 shadow-[0_12px_40px_rgba(23,61,52,0.18)]"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header with Logo */}
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

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
            {items.map((item, idx) => {
              const active = isItemActive(item, location.pathname);

              return (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -15 }}
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
                        {/* Background highlight for active state */}
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
                        
                        {/* Text content */}
                        <motion.span
                          className="relative z-10 flex items-center gap-2.5 w-full"
                          animate={isActive ? "active" : "inactive"}
                          variants={animationVariants.navItem}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Left accent indicator */}
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

          {/* Footer Logout Button */}
          <div className="border-t border-white/15 p-3">
            <motion.button
              type="button"
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300"
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
          <header className="flex min-w-0 flex-col gap-3 border-b border-white/15 bg-gradient-to-b from-[rgba(33,76,63,0.82)] to-[rgba(33,76,63,0.68)] px-3 py-3 text-white backdrop-blur-md sm:px-6 sm:py-4">
            {/* Line 1: Horizontal Menu (Mobile Only) / User Info (Desktop) */}
            <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
              {/* Mobile: Horizontal Scrollable Menu with Smooth Animation */}
              <div className="flex lg:hidden min-w-0 flex-1">
                <div
                  ref={mobileMenuRef}
                  className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {/* Home Dropdown Button */}
                  <div ref={homeDropdownRef} className="relative shrink-0 snap-center">
                    <motion.button
                      type="button"
                      onClick={() => setHomeDropdownOpen(!homeDropdownOpen)}
                      className="shrink-0 snap-center rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[rgba(33,76,63,0.68)] flex items-center gap-1.5 whitespace-nowrap"
                      initial={false}
                      animate={{
                        backgroundColor: homeDropdownOpen
                          ? "rgba(234, 243, 238, 1)"
                          : "rgba(255, 255, 255, 0.1)",
                        color: homeDropdownOpen
                          ? "rgba(23, 61, 52, 1)"
                          : "rgba(255, 255, 255, 0.75)",
                        boxShadow: homeDropdownOpen
                          ? "0 4px 12px rgba(23, 61, 52, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.3)"
                          : "none",
                      }}
                      transition={{
                        duration: 0.35,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      style={{
                        border: homeDropdownOpen
                          ? "1px solid rgba(210, 233, 225, 0.5)"
                          : "1px solid transparent",
                        transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    >
                      Home
                      <motion.span
                        animate={{ rotate: homeDropdownOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex items-center"
                      >
                        <ChevronDown size={16} />
                      </motion.span>
                    </motion.button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {homeDropdownOpen && (
                        <motion.div
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute left-0 top-full mt-2 w-40 rounded-lg bg-white shadow-lg border border-[#dde7df] overflow-hidden z-[100]"
                          style={{ originY: 0 }}
                        >
                          <button
                            type="button"
                            onClick={() => handleHomeDropdownItemClick("/")}
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#0F3D2E] hover:bg-[#edf5ef] active:bg-[#e0ede8] transition-colors duration-150"
                          >
                            Home
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHomeDropdownItemClick("#about")}
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#0F3D2E] hover:bg-[#edf5ef] active:bg-[#e0ede8] transition-colors duration-150 border-t border-[#dde7df]"
                          >
                            About Us
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHomeDropdownItemClick("#contact")}
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#0F3D2E] hover:bg-[#edf5ef] active:bg-[#e0ede8] transition-colors duration-150 border-t border-[#dde7df]"
                          >
                            Contact Us
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Opportunities Link */}
                  <a
                    href="/jobs"
                    className="shrink-0 snap-center rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-white/75 hover:text-white hover:bg-white/18 border border-transparent hover:border-white/20 transition-all duration-300 whitespace-nowrap"
                  >
                    Opportunities
                  </a>

                  {/* Dashboard Link */}
                  <NavLink
                    to={`/${currentRole}/dashboard`}
                    className="shrink-0 snap-center"
                  >
                    {({ isActive }) => (
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: isActive
                            ? "rgba(234, 243, 238, 1)"
                            : "rgba(255, 255, 255, 0.1)",
                          color: isActive
                            ? "rgba(23, 61, 52, 1)"
                            : "rgba(255, 255, 255, 0.75)",
                          boxShadow: isActive
                            ? "0 4px 12px rgba(23, 61, 52, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.3)"
                            : "none",
                        }}
                        transition={{
                          duration: 0.35,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        className="relative whitespace-nowrap rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[rgba(33,76,63,0.68)]"
                        style={{
                          border: isActive
                            ? "1px solid rgba(210, 233, 225, 0.5)"
                            : "1px solid transparent",
                          transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          Dashboard
                          {isActive && (
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

                  {/* Logout Button */}
                  <motion.button
                    type="button"
                    onClick={handleLogout}
                    className="shrink-0 snap-center rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-white/75 hover:text-white hover:bg-white/18 border border-transparent hover:border-white/20 transition-all duration-300 whitespace-nowrap"
                  >
                    Logout
                  </motion.button>
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
