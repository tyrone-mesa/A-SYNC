import React, { useEffect, useState } from "react";
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
  const linkClassName = `nav-slide relative z-10 inline-flex items-center rounded-full px-2 py-1 text-[14px] font-medium tracking-[-0.01em] transition duration-150 ${
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

// variant="overlay": absolutely positioned within a `position: relative` parent (the Home
// page Hero section) so the navbar sits on top of the hero art and scrolls away with it —
// it is NOT fixed/sticky, it simply belongs to the Hero section's own stacking context.
// variant="static" (default): sits in normal document flow at the top of non-Home pages.
const Navbar = ({ variant = "static" }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  // Messaging + notification bell are enabled for the roles that use the shared support inbox.
  const showMessaging = false;
  const showNotifications =
    user &&
    ["student", "company", "admin", "coordinator", "registrar"].includes(
      user.role,
    );

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    window.location.replace("/");
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    if (location.search.includes("auth=")) {
      navigate("/", { replace: true });
    }
  };
  const openLogin = () => {
    setMenuOpen(false);
    setAuthModal({ type: "login", portal: "student" });
  };
  const openPartnerSignup = () => {
    setMenuOpen(false);
    setAuthModal({ type: "register", from: "partner" });
  };

  useEffect(() => {
    const handlePartnerSignup = () => {
      setMenuOpen(false);
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

  const mobileNavItems = [
    {
      label: "Home",
      href: "/",
      active: location.pathname === "/" && !location.hash,
    },
    {
      label: "Opportunities",
      href: "/jobs",
      active: location.pathname === "/jobs",
    },
    {
      label: "About Us",
      href: "/#about",
      active: location.pathname === "/" && location.hash === "#about",
    },
    {
      label: "Contact Us",
      href: "/#contact",
      active: location.pathname === "/" && location.hash === "#contact",
    },
  ];

  return (
    <header
      className={`${headerPositionClass} ${headerAnimationClass} z-40 px-3 py-3 sm:px-6`}
    >
      <nav className="w-full">
        <div className="glass-panel mobile-nav-shell mx-auto flex min-h-[58px] w-full max-w-7xl items-center justify-between rounded-[22px] px-3 shadow-[0_12px_30px_rgba(15,30,53,0.14)] sm:px-5 lg:w-fit lg:max-w-none lg:px-5">
          <a
            href="/"
            aria-label="Go to ASIATECH SYNC home page"
            title="Go to home page"
            onClick={() => setMenuOpen(false)}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 shadow-sm sm:h-10 sm:w-10">
              <Logo size={28} />
            </div>
            <span className="hidden text-base font-semibold leading-tight tracking-[-0.03em] text-white sm:inline-block sm:text-lg">
              ASIATECH <span className="text-[#c4e1c1]">SYNC</span>
            </span>
          </a>

          <div className="flex min-w-0 items-center gap-3 sm:gap-6 lg:ml-8">
            <div className="hidden items-center gap-6 whitespace-nowrap lg:flex">
              <NavbarLink
                href="/"
                active={location.pathname === "/" && !location.hash}
              >
                Home
              </NavbarLink>
              <NavbarLink href="/jobs" active={location.pathname === "/jobs"}>
                Opportunities
              </NavbarLink>
              <NavbarLink
                href="/#about"
                active={location.pathname === "/" && location.hash === "#about"}
              >
                About Us
              </NavbarLink>
              <NavbarLink
                href="/#contact"
                active={
                  location.pathname === "/" && location.hash === "#contact"
                }
              >
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
                    className="nav-slide btn-lift bg-white text-[#0b5d3d] font-bold text-[13px] px-4 py-2 rounded-full shadow-[0_6px_18px_rgba(255,255,255,0.2)] hover:shadow-[0_10px_22px_rgba(255,255,255,0.24)] transition duration-150"
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
                  {showMessaging && (
                    <NavbarLink
                      to="/messages"
                      active={location.pathname.startsWith("/messages")}
                    >
                      Messages
                    </NavbarLink>
                  )}
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

            <div className="flex items-center gap-2 lg:hidden">
              {user && (
                <span className="shrink-0 text-[12px] font-semibold text-white/80">
                  {user.fullName.split(" ")[0]}
                </span>
              )}
              {showNotifications && <NotificationBell />}
              <button
                className="mobile-menu-button shrink-0 rounded-full border border-white/20 bg-white/10 p-2 text-white transition duration-150 hover:bg-white/15"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-drawer-menu mt-3 flex flex-col gap-2 rounded-[22px] border border-white/10 bg-[#1e4a3d]/95 px-3 py-3 shadow-[0_16px_36px_rgba(15,45,37,0.28)] backdrop-blur-sm lg:hidden">
            {mobileNavItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`mobile-nav-menu-item ${item.active ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}

            {!user ? (
              <>
                <button
                  type="button"
                  onClick={openLogin}
                  className="mobile-nav-menu-item text-left"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={openPartnerSignup}
                  className="mobile-nav-cta"
                >
                  Become a Partner
                </button>
              </>
            ) : (
              <>
                <Link
                  to={roleHome[user.role]}
                  className="mobile-nav-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {showMessaging && (
                  <Link
                    to="/messages"
                    className="mobile-nav-menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Messages
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mobile-nav-logout"
                >
                  Log Out
                </button>
              </>
            )}
          </div>
        )}
      </nav>
      <AnimatePresence initial={false} mode="sync">
        {authModal?.type === "login" && (
          <motion.div
            key="login-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
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
            initial={{ opacity: 0, x: 56 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
