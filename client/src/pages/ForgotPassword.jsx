import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/axios";
import Logo from "../components/Logo";

// Reachable from every portal tab on the Login page (Student, Company, Admin). Always shows
// the same generic confirmation regardless of whether the email exists — the API itself
// doesn't reveal that either, so this page can't be used to check who has an account.
//
// Two steps in one component: (1) enter email, get a 6-digit code emailed; (2) enter that
// code plus a new password. Kept as one page (with internal step state) rather than a
// second route, since there's no token to put in a URL anymore.
const ForgotPassword = ({ modal = false, onClose, onBack }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState("request"); // 'request' | 'verify'
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      if (data.emailUnavailable) {
        setNotice(
          "Email delivery is temporarily unavailable. Please contact the admin office or try again later.",
        );
        setError("");
        return;
      }
      setNotice(
        data.devCode
          ? `${data.message} Local development mode — since SMTP isn't configured, here's the code directly: ${data.devCode}`
          : data.message,
      );
      setStep("verify");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        code: form.code,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={
        modal
          ? "fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#102f25]/95 px-4 py-8"
          : "min-h-screen bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] flex items-center justify-center px-4 py-12"
      }
      onMouseDown={(event) => {
        if (modal && event.target === event.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${modal ? "relative isolate box-border grid h-[720px] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-[28px] border border-[#b8d2c0] bg-white p-0 shadow-[0_24px_60px_rgba(15,61,46,0.24)] sm:h-[720px] sm:grid-cols-[23rem_minmax(0,1fr)]" : "card relative w-full max-w-md p-8"}`}
      >
        {modal && (
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
                Get back to your opportunities.
              </p>
            </div>
          </div>
        )}
        {modal && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 text-xl leading-none text-navy/65 transition hover:text-navy"
            aria-label="Close password recovery"
          >
            ×
          </button>
        )}
        <div className={modal ? "relative z-10 p-7 sm:p-9" : ""}>
          <button
            type="button"
            onClick={() => (modal ? onBack?.() : navigate("/login"))}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#0b5d3d] transition hover:text-[#084c2c]"
            aria-label="Back to login"
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
          <div className="mb-5 flex justify-center">
            <Logo size={60} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h1 className="font-display font-bold text-2xl text-[#1f2d3d] mb-1 text-center">
                  Password reset!
                </h1>
                <p className="text-[#1f2d3d] text-sm mb-6 text-center font-medium">
                  Redirecting you to log in…
                </p>
                <div className="rounded-lg bg-gold/15 border border-gold/40 text-[#457D53] text-sm px-4 py-3">
                  Password reset successfully. You can now log in with your new
                  password.
                </div>
              </motion.div>
            ) : step === "request" ? (
              <motion.div
                key="request"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h1 className="font-display font-bold text-2xl text-[#1f2d3d] mb-1 text-center">
                  Forgot your password?
                </h1>
                <p className="text-[#1f2d3d] text-sm mb-6 text-center font-medium">
                  Enter your account email and we'll send a 6-digit code to
                  reset it.
                </p>

                {error && (
                  <div className="mb-4 rounded-lg bg-coral/15 border border-coral/40 text-[#DF2E1B] text-sm px-4 py-3">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="forgot-email">
                      Email address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      onPaste={(event) => event.preventDefault()}
                      required
                      className={`input-field ${
                        /^\d+$/.test(form.password.trim())
                          ? "numeric-value"
                          : ""
                      }`}
                      placeholder="Enter your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? "Sending…" : "Send Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => (modal ? onBack?.() : navigate("/login"))}
                    className="block text-center text-sm font-semibold text-[#1a5c46] hover:text-[#123f32] hover:underline"
                  >
                    Back to Log In
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h1 className="font-display font-bold text-2xl text-[#1f2d3d] mb-1 text-center">
                  Enter your code
                </h1>
                <p className="text-[#1f2d3d] text-sm mb-6 text-center font-medium">
                  Check{" "}
                  <span className="font-semibold text-[#1a5c46]">{email}</span>{" "}
                  for a 6-digit code, then choose a new password below. The code
                  expires in 10 minutes.
                </p>

                {notice && (
                  <div className="mb-4 rounded-lg bg-navy/5 border border-black/10 text-navy/70 text-xs px-4 py-3">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="mb-4 rounded-lg bg-coral/15 border border-coral/40 text-[#DF2E1B] text-sm px-4 py-3">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="forgot-code">
                      6-digit code
                    </label>
                    <input
                      id="forgot-code"
                      type="text"
                      name="code"
                      onPaste={(event) => event.preventDefault()}
                      required
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      autoComplete="one-time-code"
                      className="input-field text-center font-semibold tracking-[0.5em]"
                      placeholder="123456"
                      value={form.code}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="forgot-password-new">
                      New Password
                    </label>
                    <input
                      id="forgot-password-new"
                      type="password"
                      name="password"
                      onPaste={(event) => event.preventDefault()}
                      required
                      minLength={6}
                      className={`input-field ${
                        /^\d+$/.test(form.password.trim())
                          ? "numeric-value"
                          : ""
                      }`}
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="forgot-password-confirm">
                      Confirm New Password
                    </label>
                    <input
                      id="forgot-password-confirm"
                      type="password"
                      name="confirmPassword"
                      onPaste={(event) => event.preventDefault()}
                      required
                      minLength={6}
                      className={`input-field ${
                        /\d/.test(email) ? "numeric-value" : ""
                      }`}
                      placeholder="Re-enter your new password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? "Resetting…" : "Reset Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setError("");
                      setNotice("");
                    }}
                    className="block w-full text-center text-sm font-semibold text-[#1a5c46] hover:text-[#123f32] hover:underline"
                  >
                    Use a different email
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword;
