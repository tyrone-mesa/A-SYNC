import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
    <span className="badge bg-coral/15 text-[#DF2E1B] border border-coral/40 mb-4">403</span>
    <h1 className="font-display font-bold text-2xl text-navy mb-2">Access Restricted</h1>
    <p className="text-navy/65 mb-6 max-w-sm">
      Your account role doesn&apos;t have permission to view this page.
    </p>
    <Link to="/" className="btn-primary">
      Back to Home
    </Link>
  </div>
);

export default Unauthorized;
