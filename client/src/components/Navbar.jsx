import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";

const roleHome = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  admin: "/admin/dashboard",
  coordinator: "/coordinator/dashboard",
  registrar: "/registrar/dashboard",
};

const NavbarLink = ({ to, href, active, children, className = "" }) => {
  const linkClassName = `nav-slide relative z-10 inline-flex items-center rounded-full px-2 py-1 text[14px] font-medium tracking-[-0.01em] transition duration-150 ${
    active ? "text-[#173d34]" : "text-white/85 hover:text-white"
  } ${className}`;
  const linkProps = {
    "aria-current": active ? "page" : undefined,
    className: linkClassName,
  };
  const content = (
    <>
      {active && (
        <motion.span
          layoutId="navbar-active-highlight"
          className="pointer-events-none absolute inset-0 z-[-1] rounded-full bg-[#eaf3ee] shadow-sm ring-1 ring-[#dfe9e3]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </>
  );

  return href ? (
    <a href={href} {...linkProps}>
      {content}
    </a>
  ) : (
    <Link to={to} {...linkProps}>
      {content}
    </Link>
  );
};

const Navbar = ({ variant = "static" }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const dropdownRef = useRef(null);
  const navContainerRef = useRef(null);

  const showNotifications =
    user &&
    ["student", "company", "admin", "coordinator", "registrar"].includes(
      user.role,
    );

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    window.location.replace("/");
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    if (location.search.includes("auth=")) {
      navigate("/", { replace: true });
    }
  };

  const openLogin = () => {
    setMobileMenuOpen(false);
    setAuthModal({ type: "login", portal: "student" });
  };

  const openPartnerSignup = () => {
    setMobileMenuOpen(false);
    setAuthModal({ type: "register", from: "partner" });
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close dropdown when clicking outside - improved logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if clicking outside the navbar entirely
      if (navContainerRef.current && !navContainerRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      // Use capturing phase to ensure we catch clicks
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("touchstart", handleClickOutside, true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true);
        document.removeEventListener("touchstart", handleClickOutside, true);
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handlePartnerSignup = () => {
      setMobileMenuOpen(false);
      setAuthModal({ type: "register", from: "partner" });
    };
    window.addEventListener("asiatech:partner-signup", handlePartnerSignup);
    return () =>
      window.removeEventListener(
        "asiatech:partner-signup",
        handlePartnerSignup,
      );
  }, []);

  useEffect(() => {
    if (location.pathname === "/" && location.search === "?auth=login") {
      setAuthModal({ type: "login", portal: "student" });
    }
  }, [location.pathname, location.search]);

  const headerPositionClass =
    variant === "overlay" ? "absolute inset-x-0 top-0" : "relative w-full";
  const headerAnimationClass =
    variant === "overlay" ? "" : "animate-nav-fade";

  const mobileNavLinkClass = (isActive) =>
    `relative text-[14px] font-semibold text-white transition-all duration-200 hover:text-white/80 pb-1 cursor-pointer active:scale-95 ${
      isActive ? "border-b-2 border-[#F6C744]" : "border-b-2 border-transparent"
    }`;

  return (
    <header
      className={`${headerPositionClass} ${headerAnimationClass} z-40 px-3 py-3 sm:px-6`}
      ref={navContainerRef}
    >
      <nav className="w-full">
        <div className="glass-panel mx-auto flex min-h-[60px] w-full max-w-7xl items-center justify-between rounded-[28px] px-3 shadow-[0_12px_30px_rgba(15,30,53,0.14)] sm:px-5 lg:w-fit lg:max-w-none">
          <a
            href="/"
            aria-label="Go to ASIATECH SYNC home page"
            title="Go to home page"
            className="group flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 shadow-sm sm:h-10 sm:w-10">
              <Logo size={28} />
            </div>
            <span className="font-display font-semibold tracking-[-0.02em] text-lg leading-tight text-white">
              ASIATECH <span className="text-[#c4e1c1]">SYNC</span>
            </span>
          </a>

          <div className="flex min-w-0 items-center gap-3 sm:gap-6 lg:ml-8">
            <div className="hidden items-center gap-6 whitespace-nowrap lg:flex">
              <NavbarLink href="/" active={location.pathname === "/" && !location.hash}>
                Home
              </NavbarLink>
              <NavbarLink href="/jobs" active={location.pathname === "/jobs"}>
                Opportunities
              </NavbarLink>
              <NavbarLink href="/#about" active={location.pathname === "/" && location.hash === "#about"}>
                About Us
              </NavbarLink>
              <NavbarLink href="/#contact" active={location.pathname === "/" && location.hash === "#contact"}>
                Contact Us
              </NavbarLink>

              {!user && (
                <>
                  <button
                    type="button"
                    onClick={openLogin}
                    className="nav-slide text-white/85 hover:text-white text-[14px] font-medium tracking-[-0.01em] transition duration-150"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={openPartnerSignup}
                    className="nav-slide btn-lift bg-white text-[#0b5d3d] font-bold text-[13px] px-4 py-2 rounded-full shadow-[0_6px_18px_rgba(255,255,255,0.2)] hover:shadow-[0_10px_22px_rgba(255,255,255,0.25)]"
                  >
                    Become a Partner
                  </button>
                </>
              )}

              {user && (
                <>
                  <NavbarLink to={roleHome[user.role]} active={false}>
                    Dashboard
                  </NavbarLink>
                  <div className="flex items-center gap-3 border-l border-white/15 pl-8">
                    <span className="text-[13px] text-white/70">
                      <span className="font-semibold text-white">
                        {user.fullName.split(" ")[0]}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-full border border-white/30 px-3.5 py-1.5 text-[13px] font-medium text-white transition duration-150 hover:border-white/50 hover:bg-white/15"
                    >
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 lg:hidden">
              {showNotifications && <NotificationBell />}
              {user && (
                <span className="shrink-0 text-[12px] font-semibold text-white/80">
                  {user.fullName.split(" ")[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <div className="mt-3 flex justify-center">
            <div className="flex items-center gap-4 whitespace-nowrap overflow-x-auto sm:gap-6 pb-2 px-2">
              {/* Home Dropdown - Fixed positioning to escape parent overflow */}
              <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className={mobileNavLinkClass(false)}
                  aria-expanded={mobileMenuOpen}
                  aria-haspopup="true"
                  aria-label="Home menu"
                >
                  Home
                  <motion.span
                    className="inline-block ml-1 transition-transform duration-300"
                    animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    ▼
                  </motion.span>
                </button>

                <AnimatePresence>
                  {mobileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{
                        duration: 0.25,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      className="fixed left-1/2 top-16 z-[9999] w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-b from-[#1a4d42] to-[#0f3d35] shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
                    >
                      <Link
                        to="/"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-left text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/15 active:bg-white/20"
                      >
                        Home
                      </Link>

                      <Link
                        to="/#about"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block border-t border-white/10 px-4 py-3 text-left text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/15 active:bg-white/20"
                      >
                        About Us
                      </Link>

                      <Link
                        to="/#contact"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block border-t border-white/10 px-4 py-3 text-left text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/15 active:bg-white/20"
                      >
                        Contact Us
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Opportunities Link */}
              <Link
                to="/jobs"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass(location.pathname === "/jobs")}
              >
                Opportunities
              </Link>

              {/* Dashboard Link - visible only when logged in */}
              {user && (
                <Link
                  to={roleHome[user.role]}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass(
                    location.pathname.startsWith(roleHome[user.role]),
                  )}
                >
                  Dashboard
                </Link>
              )}

              {/* Logout/Login Button */}
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                  }}
                  className={mobileNavLinkClass(false)}
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLogin}
                  className={mobileNavLinkClass(false)}
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence initial={false} mode="wait">
        {authModal?.type === "login" && (
          <motion.div
            key="login-modal"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="contents"
          >
            <Login
              modal
              initialPortal={authModal.portal}
              onClose={closeAuthModal}
              onCompanyRegister={() =>
                setAuthModal({ type: "register", from: "login" })
              }
              onForgotPassword={() => setAuthModal({ type: "forgot" })}
            />
          </motion.div>
        )}
        {authModal?.type === "forgot" && (
          <motion.div
            key="forgot-modal"
            initial={{ opacity: 0, scale: 0.985, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="contents"
          >
            <ForgotPassword
              modal
              onClose={closeAuthModal}
              onBack={() => setAuthModal({ type: "login", portal: "student" })}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {authModal?.type === "register" && (
        <Register
          modal
          onClose={closeAuthModal}
          onBack={
            authModal.from === "login"
              ? () => setAuthModal({ type: "login", portal: "company" })
              : closeAuthModal
          }
          onLogin={() => setAuthModal({ type: "login", portal: "company" })}
        />
      )}
    </header>
  );
};

export default Navbar;
