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

        <div className="lg:hidden">
          <div
            ref={mobileNavRef}
            className="mt-3 flex snap-x snap-mandatory justify-center overflow-x-auto pb-1 scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Link
                to="/"
                aria-current={
                  location.pathname === "/" && !location.hash
                    ? "page"
                    : undefined
                }
                className={mobileNavLinkClass(location.pathname === "/" && !location.hash)}
              >
                Home
              </Link>

              <Link
                to="/jobs"
                aria-current={location.pathname === "/jobs" ? "page" : undefined}
                className={mobileNavLinkClass(location.pathname === "/jobs")}
              >
                Opportunities
              </Link>

              {user && (
                <Link
                  to={roleHome[user.role]}
                  aria-current={
                    location.pathname.startsWith(roleHome[user.role])
                      ? "page"
                      : undefined
                  }
                  className={mobileNavLinkClass(
                    location.pathname.startsWith(roleHome[user.role]),
                  )}
                >
                  Dashboard
                </Link>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
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
    </header>
  );
};

export default Navbar;
