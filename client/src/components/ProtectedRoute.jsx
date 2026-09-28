import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";
import DashboardLoading from "./DashboardLoading";

// Wraps a route so only authenticated users of the correct role(s) can view it.
// Usage: <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    const storedUser = localStorage.getItem("asiatech_user");
    let storedRole = null;
    try {
      storedRole = storedUser ? JSON.parse(storedUser).role : null;
    } catch {
      storedRole = null;
    }
    return storedRole ? <DashboardLoading role={storedRole} /> : <Loader />;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
