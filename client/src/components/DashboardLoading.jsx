import React from "react";
import DashboardShell from "./DashboardShell";
import StatCardSkeleton from "./StatCardSkeleton";
import ListRowSkeleton from "./ListRowSkeleton";

// Number of stat tiles each role's dashboard actually renders.
const STAT_COUNT = { admin: 5, coordinator: 4, registrar: 4 };

// Shown while a dashboard fetches its first data. Renders shaped placeholders
// (stat tiles + list rows) instead of a blank area, so the layout doesn't jump
// when the real content streams in.
const DashboardLoading = ({ role, statCount }) => {
  const count = statCount ?? (STAT_COUNT[role] || 3);
  return (
  <DashboardShell role={role} title="Dashboard">
    <div aria-busy="true" aria-label="Loading dashboard">
      {count > 0 && <StatCardSkeleton count={count} />}
      <div className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f8fbfa] p-4 shadow-sm">
        <ListRowSkeleton rows={5} />
      </div>
    </div>
  </DashboardShell>
  );
};

export default DashboardLoading;