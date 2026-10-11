import React from "react";
import Skeleton from "./Skeleton";

// Row placeholders for the divide-y list panels used across dashboards and
// management pages (applications, users, students, job postings...).
const ListRowSkeleton = ({ rows = 5, badge = true }) => (
  <div className="divide-y divide-black/10" aria-busy="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        {badge && <Skeleton className="h-6 w-20 shrink-0 rounded-full" />}
      </div>
    ))}
  </div>
);

export default ListRowSkeleton;
