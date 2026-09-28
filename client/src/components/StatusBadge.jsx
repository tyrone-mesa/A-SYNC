import React from "react";

// Maps application and attendance status to the correct palette treatment.
const STATUS_STYLES = {
  in_review: "bg-[#dfeecf] text-[#5E7867] border border-forest/20",
  approved: "bg-forest text-cream border border-cream/30",
  declined: "bg-coral/20 text-[#DF2E1B] border border-coral/40",
  active: "bg-[#dfeecf] text-[#5E7867] border border-forest/20",
  inactive: "bg-gray-100 text-navy/70 border border-black/10",
};

const STATUS_LABELS = {
  in_review: "In Review",
  approved: "Approved",
  declined: "Declined",
  active: "Active",
  inactive: "Inactive",
};

const StatusBadge = ({ status, label }) => {
  const cssClass =
    STATUS_STYLES[status] || "bg-gray-100 text-navy/70 border border-black/10";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  return <span className={`badge ${cssClass}`}>{displayLabel}</span>;
};

export default StatusBadge;
