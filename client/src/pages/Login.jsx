import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const Login = ({ modal = false, onClose, onCompanyRegister, onForgotPassword, initialPortal = "student" }) => {
  const [portal, setPortal] = useState(initialPortal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isModal = modal === true;

  useEffect(() => {
    if (!isModal) {
      document.title = "Login | AsiatechSync";
      return () => {
        document.title = "AsiatechSync";
      };
    }
  }, [isModal]);

  useEffect(() => {
    if (location.state?.fromCompanyRegister) {
      setPortal("company");
    }
  }, [location.state]);

  useEffect(() => {
    if (isModal && onClose) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isModal, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const normalizedEmail =
        portal === "student" && !trimmedEmail.includes("@")
          ? `${trimmedEmail}@asiatech.edu.ph`
          : trimmedEmail;

      await login({ email: normalizedEmail, password, portal });
      setBlockedMessage("");
      if (isModal && onClose) {
        onClose();
      }
      navigate("/redirecting");
    } catch (err) {
      if (err.response?.status === 423) {
        setBlockedMessage(
          "Your account has been disabled. If you believe this is a mistake, please contact the admin office."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Invalid credentials. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyAccount = async () => {
    if (!email.trim()) {
      setError("Enter your email address first so we know which account to verify.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/verify-account/request", {
        email: email.trim(),
      });
      navigate("/verify-account", {
        state: {
          email: data.email || email.trim(),
          otpId: data.otpId,
          expiresInMinutes: data.expiresInMinutes,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send the verification code right now.");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="flex h-full flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
      <div className="text-center">
        <img
          src="/system-logo/A-Sync-Logo.png"
          alt="AsiatechSync"
          className="mx-auto h-16 w-16 object-contain sm:h-20 sm:w-20"
        />
        <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-[#1a2b23] sm:text-4xl">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-[#567066] sm:text-base">
          Choose your portal and log in to ASIATECH SYNC.
        </p>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-xl flex-wrap justify-center gap-2 sm:mt-10">
        {[
          ["student", "Student"],
          ["company", "Company"],
          ["admin", "Admin"],
          ["coordinator", "Coordinator"],
          ["registrar", "Registrar"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPortal(value);
              setError("");
              setBlockedMessage("");
            }}
            className={`flex-1 min-w-[92px] rounded-full border px-3 py-2 text-xs sm:text-sm font-semibold transition ${
              portal === value
                ? "border-[#9fd8b0] bg-[#eaf8ee] text-[#1e5d46] shadow-[0_10px_25px_rgba(30,93,70,0.16)]"
                : "border-[#d9e5de] bg-white text-[#567066] hover:border-[#9fd8b0] hover:text-[#1e5d46]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {blockedMessage && (
        <p className="mt-4 text-center text-sm text-[#d94f3d]">{blockedMessage}</p>
      )}
      <p className="mt-4 text-center text-xs text-[#7d948a]">
        Use the @asiatech.edu.ph email assigned to you by the admin office.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 sm:mt-10">
        <div className="space-y-1.5 text-left">
          <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#567066] sm:text-sm sm:normal-case sm:tracking-normal sm:font-medium">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field h-11 w-full"
            placeholder="Enter your Email"
          />
        </div>

        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#567066] sm:text-sm sm:normal-case sm:tracking-normal sm:font-medium">
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                if (isModal && onForgotPassword) {
                  onForgotPassword();
                  return;
                }
                navigate("/forgot-password");
              }}
              className="text-xs font-medium text-[#1e5d46] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field h-11 w-full pr-10"
              placeholder="Enter your Password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#567066] transition hover:text-[#1e5d46]"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M4 4l16 16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-[#f3c2ba] bg-[#fdf3f1] px-3 py-2 text-sm text-[#c0392b]">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-11 w-full text-sm sm:text-base"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
          <button
            type="button"
            onClick={verifyAccount}
            disabled={loading}
            className="h-11 w-full rounded-full border border-[#b9dec6] bg-[#eaf8ee] text-sm font-semibold text-[#1e5d46] transition hover:bg-[#dff3e5] sm:text-base"
          >
            Verify account
          </button>
        </div>

        <div className="pt-2 text-center text-sm text-[#567066]">
          Don't have an account?{" "}
          {isModal && onCompanyRegister ? (
            <button
              type="button"
              onClick={onCompanyRegister}
              className="font-semibold text-[#1e5d46] hover:underline"
            >
              Register
            </button>
          ) : (
            <a href="/register" className="font-semibold text-[#1e5d46] hover:underline">
              Register
            </a>
          )}
        </div>
      </form>
    </div>
  );

  if (!isModal) {
    return (
      <div className="min-h-screen bg-[#eef4f0]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
          <div className="rounded-[28px] border border-[#d8e5dd] bg-white p-8 shadow-[0_25px_80px_rgba(14,34,28,0.12)]">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#102f25]/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="relative isolate box-border grid max-h-[calc(100dvh-2rem)] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-[28px] lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl border border-[#b8d2c0] bg-white p-0 shadow-[0_25px_80px_rgba(14,34,28,0.18)]"
        style={{ gridTemplateColumns: undefined }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login modal"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#1e5d46] shadow transition hover:bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div
          className={`grid grid-cols-1 ${modal ? "sm:grid-cols-[0.9fr_1.1fr] 2xl:grid-cols-[1fr_1fr]" : ""}`}
        >
          <div className="pointer-events-none relative h-40 overflow-hidden rounded-t-[28px] bg-[#0f3d2e] sm:h-auto sm:max-h-[50vh] sm:rounded-l-[28px] sm:rounded-tr-none lg:min-h-[600px] lg:max-h-[calc(100dvh-5rem)] 2xl:min-h-[700px]">
            <video
              className="h-full w-full object-cover object-[50%_20%]"
              src="/media/hero-intro-2.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f3d2e]/40 via-transparent to-[#0f3d2e]/65" />
                        <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-[#0f3d2e]/85 via-[#0f3d2e]/20 to-transparent p-6 pt-16 sm:block">
                          <div className="absolute inset-0 hidden flex-col items-center justify-center bg-gradient-to-t from-[#0f3d2e]/60 via-transparent to-[#0f3d2e]/30 p-6 text-center sm:flex">
            </div>
          </div>
          <div className="flex min-w-0 flex-col">{content}</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
