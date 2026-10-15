import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import { createPortal } from "react-dom";

const roleHome = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  admin: "/admin/dashboard",
  coordinator: "/coordinator/dashboard",
  registrar: "/registrar/dashboard",
};

const NavbarLink = ({ to, href, active, children, className = "" }) => {
  const linkClassName = `nav-slide relative z-10 inline-flex items-center rounded-full px-2.5 py-1.5 text-[14px] font-medium tracking-[-0.01em] transition duration-150 ${
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


// Mobile bottom-bar icons (24px stroke set, no icon dependency).
const BAR_LOGO_SRC =
  "data:image/png;base64,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";

const MOBILE_ICONS = {
  home: "M3.5 11.5 12 4l8.5 7.5 M5.5 9.8V20h4.6v-5h3.8v5h4.6V9.8",
  briefcase:
    "M4 8.5h16v10H4z M9 8.5V6.6A1.1 1.1 0 0 1 10.1 5.5h3.8A1.1 1.1 0 0 1 15 6.6v1.9 M4 12.8h16",
  grid: "M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z",
  chat: "M4.5 5h15v9.5H9.8L4.5 19z",
  power: "M12 4v7 M6.6 7.2a7 7 0 1 0 10.8 0",
  user: "M12 12.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z M5 19.5c.8-3.3 3.4-5 7-5s6.2 1.7 7 5",
};

const MobileBarIcon = ({ name }) => (
  <svg
    viewBox="0 0 24 24"
    width="21"
    height="21"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={MOBILE_ICONS[name] || MOBILE_ICONS.home} />
  </svg>
);

const Navbar = ({ variant = "static" }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState(null);

  const showNotifications =
    user &&
    ["student", "company", "admin", "coordinator", "registrar"].includes(
      user.role,
    );

  const handleLogout = () => {
    logout();
    window.location.replace("/");
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    if (location.search.includes("auth=")) {
      navigate("/", { replace: true });
    }
  };

  const openLogin = () => {
    setAuthModal({ type: "login", portal: "student" });
  };

  const openCompanySignup = () => {
    window.dispatchEvent(new CustomEvent("asiatech:partner-signup"));
  };

  // Keep the active pill visible in the scrollable mobile strip — same
  // behavior as the dashboard shell's mobile nav.
  const mobileNavRef = useRef(null);
  useEffect(() => {
    const activeLink = mobileNavRef.current?.querySelector(
      "[aria-current='page']",
    );
    if (activeLink) {
      activeLink.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (location.pathname === "/" && location.search === "?auth=login") {
      setAuthModal({ type: "login", portal: "student" });
    }
  }, [location.pathname, location.search]);

  // The desktop "Company Sign up" button and the landing page partner CTAs
  // dispatch this event; the register modal lives in this component's state,
  // so the listener must live here too. Without it the event went nowhere
  // and the button was dead.
  useEffect(() => {
    const onPartnerSignup = () => setAuthModal({ type: "register" });
    window.addEventListener("asiatech:partner-signup", onPartnerSignup);
    return () =>
      window.removeEventListener("asiatech:partner-signup", onPartnerSignup);
  }, []);

  const headerPositionClass =
    variant === "overlay" ? "absolute inset-x-0 top-0" : "relative w-full";
  const headerAnimationClass =
    variant === "overlay" ? "" : "animate-nav-fade";

  const mobileNavLinkClass = (isActive) =>
    `relative inline-flex shrink-0 snap-center items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold tracking-[-0.01em] transition-colors duration-200 ${
      isActive
        ? "border-[#d2e9e1]/50 bg-[#eaf3ee] text-[#173d34] shadow-[0_6px_18px_rgba(23,61,52,0.16),inset_0_1px_2px_rgba(255,255,255,0.35)]"
        : "border-transparent bg-white/10 text-white/80 hover:bg-white/[0.18]"
    }`;

  const tabLink = (tab) => (
    <Link
      key={tab.to}
      to={tab.to}
      aria-current={tab.active ? "page" : undefined}
      className={`flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-[9.5px] font-semibold leading-none transition-colors ${
        tab.active ? "bg-[#E7F0E9] text-[#17633e]" : "text-[#0F1E35]/55"
      }`}
    >
      <MobileBarIcon name={tab.icon} />
      <span className="max-w-[64px] truncate">{tab.label}</span>
      <span
        className={`h-1 w-1 rounded-full ${
          tab.active ? "bg-[#17633e]" : "bg-transparent"
        }`}
      />
    </Link>
  );

  return (
    <header
      className={`${headerPositionClass} ${headerAnimationClass} relative z-[100] px-3 py-3 sm:px-6`}
    >
      <nav className="relative z-50 w-full">
        <div className="glass-panel navbar-glass relative z-50 mx-auto flex min-h-[52px] w-full max-w-7xl items-center justify-between rounded-[28px] px-3 shadow-[0_12px_30px_rgba(15,30,53,0.14)] sm:min-h-[60px] sm:px-5">
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

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-6 lg:ml-6">
            <div className="hidden flex-1 items-center justify-center gap-2 whitespace-nowrap lg:flex">
              <NavbarLink href="/" active={location.pathname === "/" && !location.hash}>
                Home
              </NavbarLink>
              <NavbarLink href="/jobs" active={location.pathname === "/jobs"}>
                Opportunities
              </NavbarLink>
              <NavbarLink href="/#about" active={location.hash === "#about"}>
                About Us
              </NavbarLink>
              <NavbarLink href="/#contact" active={location.hash === "#contact"}>
                Contact Us
              </NavbarLink>

              {user ? (
                <NavbarLink to={roleHome[user.role]} active={location.pathname.startsWith(roleHome[user.role])}>
                  Dashboard
                </NavbarLink>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              {showNotifications && <NotificationBell />}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="nav-slide rounded-full border border-white/30 px-3.5 py-1.5 text-[14px] font-medium text-white transition duration-150 hover:border-white/60 hover:bg-white/10"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLogin}
                  className="nav-slide rounded-full border border-white/30 px-3.5 py-1.5 text-[14px] font-medium text-white transition duration-150 hover:border-white/60 hover:bg-white/10"
                >
                  Login
                </button>
              )}

              {!user && (
                <button
                  type="button"
                  onClick={openCompanySignup}
                  className="nav-slide rounded-full bg-[#E8C165] px-4 py-1.5 text-[14px] font-bold text-[#0F3D2E] shadow-[0_8px_20px_rgba(232,193,101,0.35)] transition duration-150 hover:bg-[#DEB24E] hover:shadow-[0_10px_24px_rgba(232,193,101,0.45)]"
                >
                  Company Sign up
                </button>
              )}
            </div>

            <div className="ml-auto mr-1.5 flex items-center gap-2 lg:hidden">
              {showNotifications && <NotificationBell />}
              {user && showNotifications && (
                <span
                  aria-hidden="true"
                  className="h-4 w-px shrink-0 bg-white/40"
                />
              )}
              {user && (
                <span className="shrink-0 text-[12px] font-semibold text-white/80">
                  {user.fullName.split(" ")[0]}
                </span>
              )}
            </div>
          </div>
        </div>


      </nav>

      {/* The auth modals render inside a portal on document.body. On the home
          page this header lives inside the hero section's stacking context, so
          a fixed overlay rendered here was trapped beneath later sections such
          as "About ASIATECHSYNC" (relative z-0). Portaling puts the overlay in
          the root stacking context, above every page section. */}
      {createPortal(
        <>
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
        </>,
        document.body,
      )}

      {/* Mobile app tab bar - icons at the bottom, center A-Sync logo.
          Portaled to document.body: on the home page this Navbar lives inside
          the hero <section class="isolate">, which traps its z-index, so the
          later "About" section painted OVER the fixed bar. */}
      {createPortal(
      <nav
        aria-label="Mobile navigation"
        className={`fixed inset-x-3 bottom-3 z-[2147483647] rounded-2xl border border-white/60 bg-white px-1.5 pt-2 shadow-[0_10px_30px_rgba(15,30,53,0.28)] scrollbar-hide lg:hidden ${
          variant === "dashboard" ? "!hidden" : ""
        }`}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-stretch gap-0.5 overflow-x-auto scrollbar-hide">
          {(() => {
            const tabs = [
              {
                to: "/",
                label: "Home",
                icon: "home",
                active: location.pathname === "/" && !location.hash,
              },
              {
                to: "/jobs",
                label: "Opportunities",
                icon: "briefcase",
                active: location.pathname === "/jobs",
              },
              ...(user
                ? [
                    {
                      to: roleHome[user.role],
                      label: "Dashboard",
                      icon: "grid",
                      active: location.pathname.startsWith(roleHome[user.role]),
                    },
                  ]
                : []),
            ];
            const mid = Math.ceil(tabs.length / 2);
            return (
              <>
                {tabs.slice(0, mid).map(tabLink)}
                <Link
                  to={user ? roleHome[user.role] : "/"}
                  aria-label="A-Sync home"
                  className="flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0.5 shadow-[0_4px_14px_rgba(15,30,53,0.22)] ring-2 ring-[#ABD1B5]">
                    <img
                      src={BAR_LOGO_SRC}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="text-[8px] font-bold leading-none tracking-[0.2em] text-[#17633e]">
                    A-SYNC
                  </span>
                  <span className="h-1 w-1 rounded-full bg-transparent" />
                </Link>
                {tabs.slice(mid).map(tabLink)}
                {user ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-[9.5px] font-semibold leading-none text-[#0F1E35]/55 transition-colors"
                  >
                    <MobileBarIcon name="power" />
                    <span>Logout</span>
                    <span className="h-1 w-1 rounded-full bg-transparent" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openLogin}
                    className="flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-[9.5px] font-semibold leading-none text-[#0F1E35]/55 transition-colors"
                  >
                    <MobileBarIcon name="user" />
                    <span>Login</span>
                    <span className="h-1 w-1 rounded-full bg-transparent" />
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </nav>,
      document.body,
      )}
    </header>
  );
};

export default Navbar;
