import React, { useRef, useState } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import FloatingMessageCircle from "./components/FloatingMessageCircle";
import Loader from "./components/Loader";
import {
  hasHomeIntroPlayedThisSession,
  markHomeIntroPlayedThisSession,
  resetHomeIntroPlayedThisSession,
} from "./utils/homeIntroSession";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Unauthorized = React.lazy(() => import("./pages/Unauthorized"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Messages = React.lazy(() => import("./pages/Messages"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = React.lazy(
  () => import("./pages/TermsAndConditions"),
);
const CookiesPolicy = React.lazy(() => import("./pages/CookiesPolicy"));

const BrowseJobs = React.lazy(() => import("./pages/student/BrowseJobs"));
const JobDetail = React.lazy(() => import("./pages/student/JobDetail"));
const StudentDashboard = React.lazy(
  () => import("./pages/student/StudentDashboard"),
);
const StudentProfile = React.lazy(
  () => import("./pages/student/StudentProfile"),
);
const MyApplications = React.lazy(
  () => import("./pages/student/MyApplications"),
);
const InterviewSimulator = React.lazy(
  () => import("./pages/student/InterviewSimulator"),
);
const InterviewRequests = React.lazy(
  () => import("./pages/student/InterviewRequests"),
);
const Journal = React.lazy(() => import("./pages/student/Journal"));
const MyEvaluation = React.lazy(() => import("./pages/student/MyEvaluation"));
const StudentEvaluations = React.lazy(
  () => import("./pages/company/StudentEvaluations"),
);
const OjtManual = React.lazy(() => import("./pages/student/OjtManual"));

const CompanyDashboard = React.lazy(
  () => import("./pages/company/CompanyDashboard"),
);
const CompanyProfile = React.lazy(
  () => import("./pages/company/CompanyProfile"),
);
const PostJob = React.lazy(() => import("./pages/company/PostJob"));
const ManageJobs = React.lazy(() => import("./pages/company/ManageJobs"));
const ApplicantsList = React.lazy(
  () => import("./pages/company/ApplicantsList"),
);
const ManageStudentAttendance = React.lazy(
  () => import("./pages/company/ManageStudentAttendance"),
);

const AdminDashboard = React.lazy(
  () => import("./pages/admin/AdminDashboard"),
);
const ManageUsers = React.lazy(() => import("./pages/admin/ManageUsers"));
const ManageAdmins = React.lazy(() => import("./pages/admin/ManageAdmins"));
const ManageCompanies = React.lazy(
  () => import("./pages/admin/ManageCompanies"),
);
const ManageStudents = React.lazy(
  () => import("./pages/admin/ManageStudents"),
);
const ManageCoordinators = React.lazy(
  () => import("./pages/admin/ManageCoordinators"),
);
const StudentDetail = React.lazy(() => import("./pages/admin/StudentDetail"));
const CompanyDetail = React.lazy(() => import("./pages/admin/CompanyDetail"));
const Reports = React.lazy(() => import("./pages/admin/Reports"));
const ArchiveUsers = React.lazy(() => import("./pages/admin/ArchiveUsers"));
const ManageRegistrars = React.lazy(
  () => import("./pages/admin/ManageRegistrars"),
);
const SecurityAudit = React.lazy(() => import("./pages/admin/SecurityAudit"));
const CoordinatorDashboard = React.lazy(
  () => import("./pages/staff/CoordinatorDashboard"),
);
const RegistrarDashboard = React.lazy(
  () => import("./pages/staff/RegistrarDashboard"),
);
const ManageStaffStudents = React.lazy(
  () => import("./pages/staff/ManageStaffStudents"),
);

function App() {
  const location = useLocation();
  // The intro plays automatically on every full page load at "/" (and replays on
  // refresh), but never restarts on client-side navigation — otherwise the
  // full-screen intro overlay would cover the navbar and kill link taps
  // (e.g. going Home -> back from the dashboard on mobile).
  const [showHomeIntro, setShowHomeIntro] = useState(
    () => {
      if (location.pathname !== "/") return false;
      try {
        const navigation = window.performance.getEntriesByType("navigation")[0];
        if (navigation?.type === "reload") {
          resetHomeIntroPlayedThisSession();
        }
        return !hasHomeIntroPlayedThisSession();
      } catch (error) {
        return true;
      }
    },
  );
  const completeHomeIntro = React.useCallback(
    () => {
      setShowHomeIntro(false);
      markHomeIntroPlayedThisSession();
    },
    [],
  );
  const isFirstPathEffectRun = useRef(true);
  React.useEffect(() => {
    if (isFirstPathEffectRun.current) {
      isFirstPathEffectRun.current = false;
      return;
    }
    // Any client-side route change ends (and never restarts) the intro.
    setShowHomeIntro(false);
  }, [location.pathname]);
  React.useEffect(() => {
    if (location.pathname !== "/" && showHomeIntro) {
      completeHomeIntro();
    }
  }, [completeHomeIntro, location.pathname, showHomeIntro]);
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
        {/* Navbar is now visible on all pages EXCEPT home (which has its own navbar in the hero) */}
        {!isHome && <Navbar variant={isDashboardRoute ? "dashboard" : "static"} />}
        <main className="flex-1">
            <motion.div
              key={
                isDashboardRoute
                  ? "/dashboard-shell"
                  : location.pathname.startsWith("/messages")
                    ? "/messages"
                    : location.pathname
              }
              initial={isDashboardRoute ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <React.Suspense
                fallback={<Loader fullScreen label="Loading page…" />}
              >
                <Routes location={location}>
                {/* Public */}
                <Route
                  path="/"
                  element={
                    <LandingPage
                      intro={showHomeIntro}
                      onIntroComplete={completeHomeIntro}
                    />
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
                <Route
                  path="/student/interviews"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <InterviewRequests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/journal"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <Journal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/evaluation"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <MyEvaluation />
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
                <Route
                  path="/company/evaluations"
                  element={
                    <ProtectedRoute roles={["company"]}>
                      <StudentEvaluations />
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
                      <CoordinatorDashboard />
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
                      <RegistrarDashboard />
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
                      <StudentDetail />
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
                  path="/admin/admins"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageAdmins />
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
              </React.Suspense>
            </motion.div>
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