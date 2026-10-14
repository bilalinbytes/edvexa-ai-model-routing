"use client";

import React, { useState, useEffect } from "react";
import { Menu, Activity, Sparkles, BookOpen, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "./Toast";

interface NavbarProps {
  onToggleMobile: () => void;
  title?: string;
  subtitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobile, title, subtitle }) => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const { success, error, info } = useToast();

  const checkConnection = async () => {
    try {
      const res = await api.checkHealth();
      if (res.status === "healthy") {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedData = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    info("Seeding benchmark datasets and baseline providers...");
    try {
      const res = await api.seedData();
      success(res.message || "Benchmark data seeded successfully!");
      // reload window or refresh data
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      error(err.message || "Failed to seed benchmark data");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="h-16 px-4 lg:px-8 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">
            {title || "Edvexa Evaluation Suite"}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status Pill */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            backendOnline === true
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : backendOnline === false
              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 cursor-pointer hover:bg-rose-500/20"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
          onClick={backendOnline === false ? checkConnection : undefined}
          title={backendOnline === false ? "Click to retry backend connection" : "Backend health status"}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendOnline === true
                ? "bg-emerald-400 animate-pulse"
                : backendOnline === false
                ? "bg-rose-400"
                : "bg-slate-400"
            }`}
          />
          <span className="hidden sm:inline">
            {backendOnline === true
              ? "API Connected"
              : backendOnline === false
              ? "API Offline (Click to retry)"
              : "Checking API..."}
          </span>
        </div>

        {/* Quick Seed Action */}
        <button
          onClick={handleSeedData}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Seed or reset standard benchmark dataset and mock providers"
        >
          {isSeeding ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{isSeeding ? "Seeding..." : "Seed Baseline Data"}</span>
        </button>

        {/* API Docs Link */}
        <a
          href="http://localhost:8000/api/v1/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
          title="Open FastAPI interactive OpenAPI Swagger documentation"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>API Docs</span>
        </a>
      </div>
    </header>
  );
};
