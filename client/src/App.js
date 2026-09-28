import React, { useState } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import FloatingMessageCircle from "./components/FloatingMessageCircle";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import CookiesPolicy from "./pages/CookiesPolicy";

import BrowseJobs from "./pages/student/BrowseJobs";
import JobDetail from "./pages/student/JobDetail";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import MyApplications from "./pages/student/MyApplications";
import InterviewSimulator from "./pages/student/InterviewSimulator";
import OjtManual from "./pages/student/OjtManual";

import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyProfile from "./pages/company/CompanyProfile";
import PostJob from "./pages/company/PostJob";
import ManageJobs from "./pages/company/ManageJobs";
import ApplicantsList from "./pages/company/ApplicantsList";
import ManageStudentAttendance from "./pages/company/ManageStudentAttendance";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageCompanies from "./pages/admin/ManageCompanies";
import ManageStudents from "./pages/admin/ManageStudents";
import ManageCoordinators from "./pages/admin/ManageCoordinators";
import StudentDetail from "./pages/admin/StudentDetail";
import CompanyDetail from "./pages/admin/CompanyDetail";
import Reports from "./pages/admin/Reports";
import ArchiveUsers from "./pages/admin/ArchiveUsers";
import ManageRegistrars from "./pages/admin/ManageRegistrars";
import SecurityAudit from "./pages/admin/SecurityAudit";
import ManageStaffStudents from "./pages/staff/ManageStaffStudents";
import RegistrarStudentDetail from "./pages/staff/RegistrarStudentDetail";

// Soft cross-fade + slide between routes. mode="wait" lets the outgoing page finish its exit
// animation before the incoming one starts, so they never overlap awkwardly.
const pageVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

function App() {
  const location = useLocation();
  const [showHomeIntro, setShowHomeIntro] = useState(
    () => location.pathname === "/",
  );
  const isDashboardRoute =
    location.pathname.startsWith("/student/") ||
    location.pathname.startsWith("/company/") ||
    location.pathname.startsWith("/admin/") ||
    location.pathname.startsWith("/coordinator/") ||
    location.pathname.startsWith("/registrar/") ||
    location.pathname.startsWith("/messages");
  // The Home page renders its own Navbar instance inside the Hero section (see
  // LandingPage.jsx) so it belongs to the Hero and scrolls away with it. Every other page
  // keeps this normal-flow navbar at the top — not fixed, not sticky, just normal document
  // flow, so it scrolls away with the rest of that page's content too.
  const isHome = location.pathname === "/";

  return (
    // reducedMotion="user" makes every framer-motion element in the app (hero entrance,
    // scroll reveals, page transitions, hover micro-interactions) automatically honor the
    // visitor's OS-level prefers-reduced-motion setting, without threading a check through
    // each component individually.
    <MotionConfig reducedMotion="user">
      <div
        className="min-h-screen flex flex-col"
        style={{
          background:
            "linear-gradient(135deg, #596869 0%, #6C8976 26%, #79B791 52%, #ABD1B5 72%, #E6EFE6 100%)",
        }}
      >
        {!isHome && <Navbar />}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={
                isDashboardRoute
                  ? "/dashboard-shell"
                  : location.pathname.startsWith("/messages")
                    ? "/messages"
                    : location.pathname
              }
              variants={pageVariants}
              initial={isDashboardRoute ? false : "initial"}
              animate={isDashboardRoute ? false : "animate"}
              exit={isDashboardRoute ? false : "exit"}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <Routes location={location}>
                {/* Public */}
                <Route
                  path="/"
                  element={
                    showHomeIntro ? (
                      <LandingPage
                        intro
                        onIntroComplete={() => setShowHomeIntro(false)}
                      />
                    ) : (
                      <LandingPage />
                    )
                  }
                />
                <Route
                  path="/login"
                  element={<Navigate to="/?auth=login" replace />}
                />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/forgot-password"
                  element={<Navigate to="/?auth=login" replace />}
                />
                <Route path="/jobs" element={<BrowseJobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/cookies" element={<CookiesPolicy />} />

                {/* Messages — shared across authenticated account roles */}
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute
                      roles={[
                        "student",
                        "company",
                        "admin",
                        "coordinator",
                        "registrar",
                      ]}
                    >
                      <Messages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages/:id"
                  element={
                    <ProtectedRoute
                      roles={[
                        "student",
                        "company",
                        "admin",
                        "coordinator",
                        "registrar",
                      ]}
                    >
                      <Messages />
                    </ProtectedRoute>
                  }
                />

                {/* Student */}
                <Route
                  path="/student/dashboard"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/ojt-manual"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <OjtManual />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/applications"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <MyApplications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/interview"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <InterviewSimulator />
                    </ProtectedRoute>
                  }
                />

                {/* Company */}
                <Route
                  path="/company/dashboard"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <CompanyDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/company/profile"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <CompanyProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/company/jobs"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <ManageJobs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/company/jobs/new"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <PostJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/company/jobs/:jobId/applicants"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <ApplicantsList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/company/jobs/:jobId/edit"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <PostJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/company/attendance"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <ManageStudentAttendance />
                    </ProtectedRoute>
                  }
                />

                {/* Admin */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Coordinator and Registrar staff areas */}
                <Route
                  path="/coordinator/dashboard"
                  element={
                    <ProtectedRoute roles={["coordinator"]}>
                      <ManageStaffStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/students"
                  element={
                    <ProtectedRoute roles={["coordinator"]}>
                      <ManageStaffStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/students/:id"
                  element={
                    <ProtectedRoute roles={["coordinator"]}>
                      <StudentDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/registrar/dashboard"
                  element={
                    <ProtectedRoute roles={["registrar"]}>
                      <ManageStaffStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/registrar/students"
                  element={
                    <ProtectedRoute roles={["registrar"]}>
                      <ManageStaffStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/registrar/students/:id"
                  element={
                    <ProtectedRoute roles={["registrar"]}>
                      <RegistrarStudentDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/students"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/students/:id"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <StudentDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/coordinators"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageCoordinators />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/companies"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageCompanies />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/companies/:id"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <CompanyDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/archive"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ArchiveUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/registrars"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageRegistrars />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/security-audit"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <SecurityAudit />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
        <FloatingMessageCircle />
        <footer className="border-t border-white/10 bg-[#2f4d46] py-6 text-center text-white/65 text-xs">
          <p>
            © {new Date().getFullYear()} ASIATECH SYNC. All rights reserved.
          </p>
          <p className="mt-2 flex items-center justify-center gap-3">
            <a href="/privacy" className="hover:text-white hover:underline">
              Privacy Policy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/terms" className="hover:text-white hover:underline">
              Terms & Conditions
            </a>
            <span aria-hidden="true">·</span>
            <a href="/cookies" className="hover:text-white hover:underline">
              Cookies Policy
            </a>
          </p>
        </footer>
      </div>
    </MotionConfig>
  );
}

export default App;
