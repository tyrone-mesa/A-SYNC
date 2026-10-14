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

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () =>
      document.body.classList.toggle("has-mobile-tabbar", mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.classList.remove("has-mobile-tabbar");
    };
  }, []);

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
        <div className="glass-panel relative z-50 mx-auto flex min-h-[60px] w-full max-w-7xl items-center justify-between rounded-[28px] px-3 shadow-[0_12px_30px_rgba(15,30,53,0.14)] sm:px-5">
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

      {/* Mobile app tab bar - icons at the bottom, center A-Sync logo. */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/60 bg-white/90 px-1.5 pt-2 shadow-[0_10px_30px_rgba(15,30,53,0.2)] backdrop-blur-xl scrollbar-hide lg:hidden"
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
                    {
                      to: "/messages",
                      label: "Messages",
                      icon: "chat",
                      active: location.pathname.startsWith("/messages"),
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
                  className="relative flex min-w-[64px] flex-1 flex-col items-center justify-end self-stretch px-1 pb-1"
                >
                  <span className="absolute -top-7 flex h-12 w-12 items-center justify-center rounded-full bg-white p-1 shadow-[0_8px_20px_rgba(15,30,53,0.28)] ring-4 ring-[#E7F0E9]">
                    <img
                      src="/system-logo/A-Sync-Logo.png"
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="mt-6 text-[8px] font-bold tracking-[0.2em] text-[#17633e]">
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
      </nav>
    </header>
  );
};

export default Navbar;
