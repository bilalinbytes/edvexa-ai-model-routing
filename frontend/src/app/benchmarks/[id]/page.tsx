"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { BenchmarkJob, BenchmarkResult } from "@/lib/types";
import { useToast } from "@/components/Toast";

function BenchmarkDetailContent() {
  const routeParams = useParams();
  const jobId = (typeof routeParams?.id === "string" ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : "") || "";

  const [job, setJob] = useState<BenchmarkJob | null>(null);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Filters
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { success, error, info } = useToast();

  const loadJobData = async () => {
    try {
      const [jobData, resultsData] = await Promise.all([
        api.getBenchmark(jobId),
        api.getBenchmarkResults(jobId),
      ]);
      setJob(jobData);
      setResults(resultsData);
    } catch (err: any) {
      error(err.message || "Failed to load benchmark results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  // If job is still running, poll every 2s
  useEffect(() => {
    if (!job || (job.status !== "RUNNING" && job.status !== "QUEUED")) return;

    const interval = setInterval(async () => {
      try {
        const [updatedJob, updatedResults] = await Promise.all([
          api.getBenchmark(jobId),
          api.getBenchmarkResults(jobId),
        ]);
        setJob(updatedJob);
        setResults(updatedResults);
      } catch {
        // quiet
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job, jobId]);

  const handleRetry = async () => {
    setRetrying(true);
    info("Retrying failed evaluations...");
    try {
      const updated = await api.retryBenchmark(jobId);
      setJob(updated);
      success("Retry triggered successfully!");
      loadJobData();
    } catch (err: any) {
      error(err.message || "Failed to retry benchmark");
    } finally {
      setRetrying(false);
    }
  };

  const providers = Array.from(new Set(results.map((r) => r.provider_name || r.provider_id)));

  const filteredResults = results.filter((r) => {
    if (providerFilter !== "ALL" && (r.provider_name || r.provider_id) !== providerFilter)
      return false;
    if (statusFilter === "PASSED" && !r.passed) return false;
    if (statusFilter === "FAILED" && r.passed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.test_case_name?.toLowerCase().includes(q);
      const matchResp = r.response_content?.toLowerCase().includes(q);
      const matchReason = r.evaluation_reason?.toLowerCase().includes(q);
      if (!matchName && !matchResp && !matchReason) return false;
    }
    return true;
  });

  return (
    <AppShell
      title={`Benchmark Results: #${jobId.substring(0, 8)}`}
      subtitle="Comprehensive prompt responses, evaluation breakdown, latency provenance, and error traces"
    >
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/benchmarks"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Benchmarks</span>
        </Link>
        <button
          onClick={loadJobData}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          title="Refresh results"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading execution results...</span>
        </div>
      ) : !job ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
          Job not found.
        </div>
      ) : (
        <>
          {/* Job summary header card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl shadow-black/20">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {job.dataset_name || `Job #${job.id.substring(0, 8)}`}
                </h2>
                <Badge status={job.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Total: {job.total_requests} reqs</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {job.successful_requests} successful
                </span>
                {job.failed_requests > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-400 font-semibold">
                      {job.failed_requests} failed
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Models: {job.selected_provider_ids.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(job.failed_requests > 0 || job.status === "FAILED") && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
                  <span>{retrying ? "Retrying..." : "Retry Failed Evaluations"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Provider filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Cpu className="w-3.5 h-3.5" />
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Models ({providers.length})</option>
                  {providers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PASSED">Passed Only</option>
                  <option value="FAILED">Failed Only</option>
                </select>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search prompt or response..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Results List */}
          {filteredResults.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
              No evaluation results match the active filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((res) => {
                const isExpanded = expandedId === res.id;
                const qualityPct = Math.round(res.quality_score * 100);

                return (
                  <div
                    key={res.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      res.is_success && res.passed
                        ? "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                        : "bg-slate-900/80 border-rose-950/60 hover:border-rose-900/80"
                    }`}
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : res.id)}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant="result"
                          label={res.is_success && res.passed ? "Passed" : "Failed"}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {res.test_case_name || "Test Case"}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium">
                              via {res.provider_name}
                            </span>
                            <Badge variant="provenance" label={res.cost_provenance} />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
                            {res.evaluation_reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="text-xs font-mono font-semibold text-white">
                            {qualityPct}% score
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {Math.round(res.wall_clock_latency_ms)}ms wall
                            {res.simulated_latency_ms ? ` (~${res.simulated_latency_ms}ms sim)` : ""}
                          </div>
                        </div>

                        <button className="text-slate-400 p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details: side-by-side prompt & LLM response */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 bg-slate-950/60 space-y-4 text-xs">
                        {/* Response Content */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                              Model Response Content:
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              Tokens: {res.total_tokens ?? "N/A"} | Cost: $
                              {res.estimated_cost_usd?.toFixed(6) ?? "0.000000"}
                            </span>
                          </div>
                          <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                            {res.response_content || "No response received."}
                          </pre>
                        </div>

                        {/* Error info if failed */}
                        {!res.is_success && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                            <div className="font-semibold text-xs mb-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              <span>
                                {res.error_type || "Execution Failure"} (Attempt {res.attempt})
                              </span>
                            </div>
                            <p className="font-mono text-[11px]">{res.error_message}</p>
                            <span className="text-[10px] text-rose-400 mt-1 block">
                              Retryable: {res.retryable ? "Yes (Eligible for retry)" : "No"}
                            </span>
                          </div>
                        )}

                        {/* Evaluator specifics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">
                              Evaluator Engine:
                            </span>
                            <span className="font-mono text-slate-300">
                              {res.evaluator_name} (v{res.evaluator_version})
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">
                              Latency Breakdown:
                            </span>
                            <span className="font-mono text-slate-300">
                              Wall-clock: {Math.round(res.wall_clock_latency_ms)}ms | Simulated:{" "}
                              {res.simulated_latency_ms ?? "N/A"}ms
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default function BenchmarkDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-slate-950 text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading benchmark execution results...</span>
        </div>
      }
    >
      <BenchmarkDetailContent />
    </Suspense>
  );
}
