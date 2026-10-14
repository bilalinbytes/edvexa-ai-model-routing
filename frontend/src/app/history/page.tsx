"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  GitBranch,
  PlaySquare,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { BenchmarkJob, RecommendationAudit } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<"benchmarks" | "audits">("benchmarks");
  const [jobs, setJobs] = useState<BenchmarkJob[]>([]);
  const [audits, setAudits] = useState<RecommendationAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const { error } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, auditsData] = await Promise.all([
        api.listBenchmarks(),
        api.getRecommendationHistory(30),
      ]);
      setJobs(jobsData);
      setAudits(auditsData);
    } catch (err: any) {
      error(err.message || "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppShell
      title="Audit Trail & Historical Execution Logs"
      subtitle="Immutable event logs for benchmark runs, model evaluations, and intelligent routing decisions"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">System Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Trace evaluation jobs, partial failures, and Pareto routing explanations
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          title="Reload history"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("benchmarks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "benchmarks"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <PlaySquare className="w-4 h-4" />
          <span>Benchmark Runs ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audits")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "audits"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Routing Audits ({audits.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading audit history...</span>
        </div>
      ) : activeTab === "benchmarks" ? (
        /* Benchmark Runs List */
        jobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-slate-500 text-xs">
            No benchmark runs found in database.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-indigo-400 font-semibold">
                      #{j.id.substring(0, 8)}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {j.dataset_name || "Benchmark Run"}
                    </span>
                    <Badge status={j.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span>
                      {j.completed_requests}/{j.total_requests} requests
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">{j.successful_requests} ok</span>
                    {j.failed_requests > 0 && (
                      <span className="text-rose-400">{j.failed_requests} failed</span>
                    )}
                    <span>•</span>
                    <span>{new Date(j.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <Link
                  href={`/benchmarks/${j.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <span>Results Drill-down</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Routing Decision Audits */
        audits.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-slate-500 text-xs">
            No recommendation decision audits recorded yet. Run a simulation in Smart Routing to populate audit logs.
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map((a) => {
              const isExpanded = expandedAuditId === a.id;
              return (
                <div
                  key={a.id}
                  className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors"
                >
                  <div
                    onClick={() => setExpandedAuditId(isExpanded ? null : a.id)}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400">
                            #{a.id.substring(0, 8)}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {a.is_successful
                              ? `Selected: ${a.winner_provider_name}`
                              : "No Eligible Model"}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            strategy: {a.strategy}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
                          {a.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-400 font-mono">
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-slate-800 bg-slate-950/60 space-y-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                          Full Explanation & Rationale:
                        </span>
                        <p className="text-slate-200 leading-relaxed font-sans">{a.explanation}</p>
                      </div>

                      {a.trade_offs && (
                        <div>
                          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                            Trade-offs & Constraints:
                          </span>
                          <p className="text-amber-300/90 leading-relaxed font-sans">
                            {a.trade_offs}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                        <div>
                          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                            Active Constraints Applied:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300">
                            {JSON.stringify(a.constraints, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                            Objective Weights:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300">
                            {JSON.stringify(a.weights, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </AppShell>
  );
}
