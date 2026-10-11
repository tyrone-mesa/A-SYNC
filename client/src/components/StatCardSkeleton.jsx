import React from "react";
import Skeleton from "./Skeleton";

// Placeholder for the rounded stat tiles shown at the top of dashboards.
const StatCardSkeleton = ({ count = 3 }) => (
  <div className="mb-6 grid gap-4 sm:grid-cols-3" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-[20px] border border-[#0b5d3d]/10 bg-[#f5fbf9] p-5 shadow-sm"
      >
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-3 h-8 w-1/4" />
      </div>
    ))}
  </div>
);

export default StatCardSkeleton;
