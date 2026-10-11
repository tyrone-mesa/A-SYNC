import React from "react";
import Skeleton from "./Skeleton";

// Placeholder twin of <JobCard />: same outer shape (logo, title lines, tag pills)
// so swapping it in for the real card causes no layout shift.
const JobCardSkeleton = () => (
  <div className="card flex h-full w-full flex-col gap-4 p-5" aria-busy="true">
    <div className="flex items-center gap-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
    <div className="mt-auto flex flex-wrap gap-2 pt-1">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  </div>
);

export default JobCardSkeleton;
