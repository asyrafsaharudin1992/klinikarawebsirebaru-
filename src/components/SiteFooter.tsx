import React from 'react';
import { Link } from 'react-router-dom';

/** Shared site footer content (copyright + staff login). PublicUI keeps its own copy because it also hosts the Special Access modal trigger. */
const SiteFooter: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <footer className="bg-zinc-950 border-t border-zinc-900/50 py-6">
    <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-zinc-400 text-xs">
          &copy; {new Date().getFullYear()} Klinik Ara 24 Jam. All rights reserved.
        </p>
        <Link to="/login" className="text-zinc-400 hover:text-zinc-300 text-xs transition-colors">
          Staff Login
        </Link>
      </div>
      {children}
    </div>
  </footer>
);

export default SiteFooter;
