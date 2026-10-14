"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Database,
  PlaySquare,
  BarChart2,
  GitBranch,
  History,
  ShieldCheck,
  Server,
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Providers", href: "/providers", icon: Cpu },
    { name: "Datasets", href: "/datasets", icon: Database },
    { name: "Benchmarks", href: "/benchmarks", icon: PlaySquare },
    { name: "Comparison", href: "/compare", icon: BarChart2 },
    { name: "Smart Routing", href: "/recommendations", icon: GitBranch },
    { name: "Audit & History", href: "/history", icon: History },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shadow-indigo-500/20">
              E
            </div>
            <div>
              <span className="font-semibold tracking-tight text-white text-base">Edvexa</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v1.0
              </span>
            </div>
          </Link>
        </div>

        {/* Subtitle */}
        <div className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Model Evaluation & Routing
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* System architecture badge */}
        <div className="p-4 mx-3 mb-4 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-200 font-medium mb-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Evaluation Engine</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Zero cloud API dependencies. Offline deterministic mock evaluation with strict metric provenance.
          </p>
        </div>
      </aside>
    </>
  );
};
