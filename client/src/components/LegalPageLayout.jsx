import React from "react";
import { Link } from "react-router-dom";

// Shared shell for the legal pages (Privacy Policy, Terms & Conditions, Cookies Policy).
// Content on these pages is a starting template, not legal advice — have your school's
// data-protection officer or legal counsel review before go-live given the volume of
// student personal data (Philippine Data Privacy Act) this platform processes.
const LegalPageLayout = ({ title, lastUpdated, children }) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#edf8f2_0%,_#dfeae3_24%,_#cfe0d3_48%,_#bfd3c7_70%,_#b3c8bc_100%)] px-4 py-12">
    <div className="mx-auto max-w-3xl">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0b5d3d] hover:text-[#084c2c]"
      >
        <span aria-hidden="true">←</span> Back to Home
      </Link>
      <div className="card p-8 sm:p-10">
        <h1 className="font-display text-2xl font-bold text-navy mb-1">
          {title}
        </h1>
        <p className="mb-8 text-sm text-navy/55">Last updated: {lastUpdated}</p>
        <div className="legal-content space-y-5 text-sm leading-relaxed text-navy/80">
          {children}
        </div>
      </div>
    </div>
  </div>
);

export default LegalPageLayout;
