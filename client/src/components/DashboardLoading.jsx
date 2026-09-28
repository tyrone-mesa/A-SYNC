import React from "react";
import DashboardShell from "./DashboardShell";

const DashboardLoading = ({ role }) => (
  <DashboardShell role={role} title="Dashboard">
    <div className="min-h-[240px]" aria-busy="true" />
  </DashboardShell>
);

export default DashboardLoading;
