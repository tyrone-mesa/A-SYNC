import React from "react";
import Skeleton from "./Skeleton";

// Page-level placeholder for detail views (job posting, profiles): header block,
// meta pills, body lines and a CTA, inside the same max-w-3xl container the real
// pages use, so the transition to loaded content is seamless.
const ProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6" aria-busy="true">
    <div className="card space-y-5 p-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="space-y-2 border-t border-black/10 pt-5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="h-11 w-full rounded-full sm:w-48" />
    </div>
  </div>
);

export default ProfileSkeleton;
