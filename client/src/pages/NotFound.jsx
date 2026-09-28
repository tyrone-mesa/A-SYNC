import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
    <span className="badge bg-gray text-navy mb-4">404</span>
    <h1 className="font-display font-bold text-2xl text-navy mb-2">Page Not Found</h1>
    <p className="text-navy/65 mb-6 max-w-sm">The page you're looking for doesn't exist.</p>
    <Link to="/" className="btn-primary">
      Back to Home
    </Link>
  </div>
);

export default NotFound;
