import React from "react";

// Base shimmer block. Uses the shared `.skeleton` utility from index.css so the
// animation is defined in one place and stays consistent across the whole app.
const Skeleton = ({ className = "" }) => (
  <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />
);

export default Skeleton;
