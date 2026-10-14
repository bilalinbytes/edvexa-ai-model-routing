"use client";

import React, { useState, Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, title, subtitle }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Main sidebar */}
      <Suspense fallback={<aside className="w-64 bg-slate-900 border-r border-slate-800 hidden lg:block shrink-0" />}>
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      </Suspense>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8 bg-slate-950/95 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
