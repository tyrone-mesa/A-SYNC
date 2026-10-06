import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

// Public sign-up is for company (employer) accounts only. Student accounts are created by
// a school administrator using an @asiatech.edu.ph email — see admin/ManageStudents.
const Register = ({ modal = false, onClose, onBack, onLogin }) => {
  const { register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
  });
  const [consent, setConsent] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (location.state?.from === "admin-companies") {
      navigate("/admin/companies");
      return;
    }
    if (location.state?.from === "login") {
      navigate("/login", { state: { portal: "company" } });
      return;
    }
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError(
        "Please confirm you've read and agree to the Privacy Policy and Terms & Conditions.",
      );
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries({ ...form, role: "company" }).forEach(([key, value]) =>
        payload.append(key, value),
      );
      if (logoFile) payload.append("logo", logoFile);
      await register(payload);
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
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
          ? "fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#102f25]/45 px-4 py-8 backdrop-blur-[8px] transition-colors duration-300"
          : "min-h-screen bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] flex items-center justify-center px-4 py-12"
      }
      onMouseDown={(event) => {
        if (modal && event.target === event.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={modal ? { opacity: 0, scale: 0.96, y: 12 } : false}
        animate={modal ? { opacity: 1, scale: 1, y: 0 } : undefined}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`card relative w-full ${modal ? "min-h-[680px] max-w-4xl overflow-hidden border-[#b8d2c0] !bg-white p-7 shadow-[0_24px_60px_rgba(15,61,46,0.24)] sm:pl-[25rem] sm:pr-9 sm:p-9" : "max-w-md p-8"} ${modal ? "backdrop-blur-none" : ""}`}
      >
        {modal && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[23rem] overflow-hidden bg-[#0f3d2e] sm:block">
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
                  Build stronger industry partnerships.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 z-10 text-xl leading-none text-navy/65 transition hover:text-navy"
              aria-label="Close partner registration"
            >
              ×
            </button>
          </>
        )}
        <motion.button
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-[#0b5d3d] hover:text-[#084c2c] font-medium text-sm transition"
        >
          <span aria-hidden="true">←</span>
          Back
        </motion.button>
        <div className="flex justify-center mb-5">
          <Logo size={60} />
        </div>

        {submitted ? (
          <>
            <h1 className="font-display font-bold text-2xl text-navy mb-1 text-center">
              Account created
            </h1>
            <p className="text-navy/65 text-sm mb-6 text-center">
              An administrator needs to verify your company before you can log
              in. You'll be able to sign in once it's approved.
            </p>
            <Link
              to={
                location.state?.from === "admin-companies"
                  ? "/admin/companies"
                  : "/login"
              }
              onClick={onClose}
              className="btn-primary w-full block text-center"
            >
              {location.state?.from === "admin-companies"
                ? "Back to Verify Companies"
                : "Back to Log In"}
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display font-bold text-2xl text-navy mb-1 text-center">
              Partner with us
            </h1>
            <p className="text-navy/65 text-sm mb-6 text-center">
              Create a company account to post OJT openings and review
              candidates.
            </p>

            <div className="rounded-lg border border-[#dfe8e0] bg-white/25 px-4 py-3 text-sm text-[#1b2d2b] shadow-[0_8px_20px_rgba(36,60,47,0.08)] backdrop-blur-sm mb-6">
              Join ASIATECH SYNC as an official industry partner. Register your
              company to connect with promising students, share meaningful OJT
              opportunities, and help shape the next generation of
              professionals.
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-coral/15 border border-coral/40 text-[#DF2E1B] text-sm px-4 py-3">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className={
                modal ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "space-y-4"
              }
            >
              <div>
                <label className="label" htmlFor="register-companyName">
                  Company name
                </label>
                <input
                  id="register-companyName"
                  type="text"
                  name="companyName"
                  required
                  className="input-field"
                  placeholder="Enter your Company name"
                  value={form.companyName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label" htmlFor="register-fullName">
                  Contact person full name
                </label>
                <input
                  id="register-fullName"
                  type="text"
                  name="fullName"
                  required
                  className="input-field"
                  placeholder="Enter your Full name"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label" htmlFor="register-email">
                  Work email address
                </label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  required
                  className="input-field"
                  placeholder="Enter your Email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label" htmlFor="register-password">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Enter your Password"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="register-logo">
                  Company logo (optional)
                </label>
                <input
                  id="register-logo"
                  type="file"
                  name="logo"
                  accept=".jpg,.jpeg,.png"
                  onChange={(event) =>
                    setLogoFile(event.target.files?.[0] || null)
                  }
                  className="input-field cursor-pointer text-sm"
                />
                <p className="mt-1 text-xs text-navy/65">
                  Skip this for now and add your logo later from your company
                  dashboard. If uploading now, use JPG, JPEG, or PNG up to 3MB.
                </p>
              </div>
              <label className="flex items-start gap-2 text-xs text-[#1b2d2b] sm:col-span-2">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I've read and agree to the{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    Terms & Conditions
                  </a>
                  .
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full sm:col-span-2"
              >
                {loading ? "Creating account…" : "Create Company Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#1b2d2b]">
              Already have an account?{" "}
              {onLogin ? (
                <button
                  type="button"
                  onClick={onLogin}
                  className="font-semibold text-[#123f32] underline-offset-2 hover:underline"
                >
                  Log in
                </button>
              ) : (
                <Link
                  to="/login"
                  className="font-semibold text-[#123f32] underline-offset-2 hover:underline"
                >
                  Log in
                </Link>
              )}
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Register;
