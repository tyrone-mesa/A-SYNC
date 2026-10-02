import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Logo from "../components/Logo";

const roleHome = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  admin: "/admin/dashboard",
  coordinator: "/coordinator/dashboard",
  registrar: "/registrar/dashboard",
};

// The portal a person picks is sent to the server, which rejects any account whose actual
// role doesn't match — a student or company account can never authenticate through the
// Admin tab, even with correct credentials, and vice versa.
const PORTALS = [
  { key: "student", label: "Student" },
  { key: "company", label: "Company" },
  { key: "admin", label: "Admin" },
  { key: "coordinator", label: "Coordinator" },
  { key: "registrar", label: "Registrar" },
];

const Login = ({
  modal = false,
  initialPortal = "student",
  onClose,
  onCompanyRegister,
  onForgotPassword,
}) => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [portal, setPortal] = useState(location.state?.portal || initialPortal);
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpAlreadyActive, setOtpAlreadyActive] = useState(false);
  const [studentStep, setStudentStep] = useState("credentials");

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handlePortalChange = (nextPortal) => {
    setPortal(nextPortal);
    setForm({ email: "", password: "", otp: "" });
    setError("");
    setOtpMessage("");
    setOtpAlreadyActive(false);
    setStudentStep("credentials");
    setShowPassword(false);
  };

  const handleBack = () => {
    if (portal === "student" && studentStep === "otp") {
      setStudentStep("credentials");
      setForm((previous) => ({ ...previous, otp: "" }));
      setOtpMessage("");
      setOtpAlreadyActive(false);
      setError("");
      return;
    }

    if (modal) {
      onClose?.();
      return;
    }
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (portal === "student" && studentStep === "credentials") {
        const { data } = await api.post("/auth/send-otp", {
          email: form.email,
          password: form.password,
        });
        setOtpMessage(
          `${data.message}${data.devOtp ? ` Local development code: ${data.devOtp}` : ""}`,
        );
        setOtpAlreadyActive(Boolean(data.alreadyActive));
        setStudentStep("otp");
        return;
      }

      const user = await login(form.email, form.password, portal, form.otp);
      onClose?.();
      navigate(roleHome[user.role] || "/");
    } catch (err) {
      if (err.response?.data?.otpRequired) {
        setStudentStep("otp");
        setOtpMessage(
          `${err.response.data.message}${err.response.data.devOtp ? ` Local development code: ${err.response.data.devOtp}` : ""}`,
        );
        setError("");
      } else {
        setError(
          err.response?.data?.message || "Login failed. Please try again.",
        );
        if (err.response?.data?.emailUnavailable) {
          setOtpMessage(
            "Email delivery is temporarily unavailable. Please contact the admin office or try again later.",
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    setOtpMessage("");
    setOtpAlreadyActive(false);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/send-otp", {
        email: form.email,
        password: form.password,
      });
      setOtpMessage(
        `${data.message}${data.devOtp ? ` Local development code: ${data.devOtp}` : ""}`,
      );
      setOtpAlreadyActive(Boolean(data.alreadyActive));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to send OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={modal ? { opacity: 0 } : false}
      animate={modal ? { opacity: 1 } : undefined}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={
        modal
          ? "fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#102f25]/60 px-4 py-4 transition-colors duration-300 sm:py-8"
          : "min-h-screen bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] flex items-center justify-center px-4 py-12"
      }
      onMouseDown={(event) => {
        if (modal && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`${modal ? "relative isolate box-border grid max-h-[calc(100dvh-2rem)] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-[28px] border border-[#b8d2c0] bg-white p-0 shadow-[0_24px_60px_rgba(15,61,46,0.24)] sm:h-[min(720px,calc(100dvh-4rem))] sm:max-h-none sm:grid-cols-[23rem_minmax(0,1fr)] sm:overflow-hidden" : "card relative w-full max-w-md p-8"}`}
      >
        {modal && (
          <>
            <div className="pointer-events-none relative hidden h-full overflow-hidden bg-[#0f3d2e] sm:block">
              <video
                className="h-full w-full object-cover object-[50%_20%]"
                src="/media/hero-intro-2.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="absolute inset-0 bg-[#0f3d2e]/55" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8c165]">
                  ASIATECH SYNC
                </p>
                <p className="mt-2 text-2xl font-bold leading-tight">
                  Connect with your next opportunity.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0F3D2E] shadow-md transition hover:bg-white hover:text-[#0B2E22] focus:outline-none focus:ring-2 focus:ring-[#1E5D46] focus:ring-offset-2"
              aria-label="Close login"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </>
        )}
        <div className={modal ? "relative z-10 p-7 sm:p-9" : ""}>
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-2 text-[#0b5d3d] hover:text-[#084c2c] font-medium text-sm transition"
            aria-label={
              portal === "student" && studentStep === "otp"
                ? "Back to student login"
                : "Back to landing page"
            }
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {portal === "student" && studentStep === "otp"
              ? "Back to student login"
              : "Back"}
          </button>
          <div className="flex justify-center mb-5">
            <Logo size={60} />
          </div>
          <h1 className="font-display font-bold text-2xl text-navy mb-1 text-center">
            Welcome back
          </h1>
          <p className="text-[#1f2d3d] text-sm mb-6 text-center font-medium">
            Choose your portal and log in to ASIATECH SYNC.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6 sm:grid-cols-3">
            {PORTALS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePortalChange(p.key)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition active:scale-[0.98] ${
                  portal === p.key
                    ? "bg-gold text-navy"
                    : "bg-navy/5 text-navy/70 hover:bg-navy/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-white/50 bg-white/25 px-4 py-3 text-xs text-[#1b2d2b] shadow-[0_8px_20px_rgba(36,60,47,0.08)] backdrop-blur-sm mb-5">
            {portal === "student" && (
              <>
                Use the{" "}
                <span className="font-bold text-[#123f32]">
                  @asiatech.edu.ph
                </span>{" "}
                email and temporary password given to you by the admin office.
              </>
            )}
            {portal === "company" && (
              <>Log in with the work email and password you registered with.</>
            )}
            {portal === "admin" && (
              <>This portal is for administrator accounts only.</>
            )}
            {portal === "coordinator" && (
              <>This portal is for student coordinators.</>
            )}
            {portal === "registrar" && <>This portal is for registrar staff.</>}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-coral/15 border border-coral/40 text-[#DF2E1B] text-sm px-4 py-3">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={modal ? "flex flex-col gap-4" : "space-y-4"}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${portal}-${studentStep}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={modal ? "flex flex-col gap-4" : "space-y-4"}
              >
                {studentStep === "credentials" && (
                  <div>
                    <label className="label" htmlFor="login-email">
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      onPaste={(event) => event.preventDefault()}
                      required
                      className={`input-field ${
                        /\d/.test(form.email) ? "numeric-value" : ""
                      }`}
                      placeholder="Enter your Email"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                )}
                {portal === "student" && studentStep === "otp" && (
                  <div>
                    <label className="label" htmlFor="login-otp">
                      OTP Authentication
                    </label>
                    <input
                      id="login-otp"
                      type="text"
                      name="otp"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      autoComplete="one-time-code"
                      className="input-field numeric-value text-center font-semibold tracking-[0.5em]"
                      placeholder="Enter Code"
                      value={form.otp}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={
                        loading ||
                        otpAlreadyActive ||
                        !form.email ||
                        !form.password
                      }
                      className="mt-2 w-full rounded-lg border border-[#1a5c46]/25 bg-white/50 px-4 py-2 text-sm font-semibold text-[#1a5c46] transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading
                        ? "Sending OTP..."
                        : otpAlreadyActive
                          ? "OTP Already Active"
                          : "Send OTP"}
                    </button>
                    {otpMessage && (
                      <p className="mt-2 rounded-lg bg-[#dfeecf] px-3 py-2 text-xs text-[#1a5c46]">
                        {otpMessage}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#1f2d3d]/70">
                      Your code is valid for this month. Save it securely or
                      take a picture for future logins.
                    </p>
                  </div>
                )}
                {studentStep === "credentials" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label mb-0" htmlFor="login-password">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-xs font-semibold text-[#1a5c46] hover:text-[#123f32] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        onPaste={(event) => event.preventDefault()}
                        required
                        className={`input-field pr-10 ${
                          /^\d+$/.test(form.password.trim())
                            ? "numeric-value"
                            : ""
                        }`}
                        placeholder="Enter your Password"
                        value={form.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-navy/65 hover:text-navy/70 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-navy/40 border-t-navy animate-spin" />
                      {portal === "student" && studentStep === "credentials"
                        ? "Verifying account..."
                        : "Logging in..."}
                    </span>
                  ) : portal === "student" && studentStep === "credentials" ? (
                    "Verify account"
                  ) : (
                    "Log In"
                  )}
                </button>
              </motion.div>
            </AnimatePresence>
          </form>

          {portal === "company" && (
            <p className="mt-3 text-center text-sm text-[#1f2d3d] font-medium">
              Don&apos;t have an account?{" "}
              {onCompanyRegister ? (
                <button
                  type="button"
                  onClick={onCompanyRegister}
                  className="text-[#1a5c46] font-semibold hover:text-[#123f32] hover:underline"
                >
                  Create New Account
                </button>
              ) : (
                <Link
                  to="/register"
                  state={{ from: "login" }}
                  className="text-[#1a5c46] font-semibold hover:text-[#123f32] hover:underline"
                >
                  Create one
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Login;
