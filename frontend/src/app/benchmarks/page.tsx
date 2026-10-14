"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlaySquare,
  Plus,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
  Cpu,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { BenchmarkJob, BenchmarkDataset, ProviderConfig } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function BenchmarksPage() {
  const [jobs, setJobs] = useState<BenchmarkJob[]>([]);
  const [datasets, setDatasets] = useState<BenchmarkDataset[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Launch modal form state
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [concurrency, setConcurrency] = useState(2);

  const { success, error, info } = useToast();

  const fetchData = async () => {
    try {
      const [jobsData, datasetsData, providersData] = await Promise.all([
        api.listBenchmarks(),
        api.listDatasets(),
        api.listProviders(),
      ]);
      setJobs(jobsData);
      setDatasets(datasetsData);
      setProviders(providersData);

      if (datasetsData.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(datasetsData[0].id);
      }
      if (providersData.length > 0 && selectedProviders.length === 0) {
        setSelectedProviders(providersData.filter((p) => p.is_enabled).map((p) => p.id));
      }
    } catch (err: any) {
      error(err.message || "Failed to load benchmark jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Polling loop for active jobs (RUNNING or QUEUED)
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "RUNNING" || j.status === "QUEUED");
    if (!hasActive) return;

    const interval = setInterval(async () => {
      try {
        const updatedJobs = await api.listBenchmarks();
        setJobs(updatedJobs);
      } catch {
        // quiet error during background poll
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      error("Please select a benchmark dataset");
      return;
    }
    if (selectedProviders.length === 0) {
      error("Please select at least one provider to evaluate");
      return;
    }

    setSubmitting(true);
    info("Enqueuing benchmark evaluation job...");
    try {
      const job = await api.createBenchmark({
        dataset_id: selectedDatasetId,
        provider_ids: selectedProviders,
        execution_config: { concurrency },
      });
      success(`Benchmark job #${job.id.substring(0, 8)} started!`);
      setIsLaunching(false);
      fetchData();
    } catch (err: any) {
      error(err.message || "Failed to launch benchmark");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    info("Claiming job and re-evaluating failed requests...");
    try {
      const retried = await api.retryBenchmark(jobId);
      success(`Benchmark #${jobId.substring(0, 8)} re-queued for retry!`);
      fetchData();
    } catch (err: any) {
      error(err.message || "Failed to retry benchmark");
    } finally {
      setRetryingJobId(null);
    }
  };

  const toggleProviderSelection = (id: string) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAllProviders = () => {
    setSelectedProviders(providers.map((p) => p.id));
  };

  return (
    <AppShell
      title="Benchmark Execution & Evaluation Engine"
      subtitle="Distributed async job queue with transactional claims, partial failure tolerance, and idempotent retries"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Benchmark Runs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time progress, request statuses, and automated retry states
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLaunching(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <PlaySquare className="w-4 h-4" />
            <span>Launch New Benchmark</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading benchmark jobs...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
          <PlaySquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Benchmark Runs Recorded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click &quot;Launch New Benchmark&quot; to test your provider models against a dataset suite.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const pct =
              job.total_requests > 0
                ? Math.round((job.completed_requests / job.total_requests) * 100)
                : 0;
            const isFinished = job.status === "COMPLETED" || job.status === "FAILED";
            const canRetry = job.failed_requests > 0 || job.status === "FAILED";

            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-md shadow-black/20"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Job Header */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-indigo-400 font-semibold">
                        #{job.id.substring(0, 8)}
                      </span>
                      <h3 className="text-base font-bold text-white truncate">
                        {job.dataset_name || "Evaluation Run"}
                      </h3>
                      <Badge status={job.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{job.total_cases} test cases</span>
                      <span>•</span>
                      <span>{job.selected_provider_ids.length} models selected</span>
                      <span>•</span>
                      <span>Created {new Date(job.created_at).toLocaleTimeString()}</span>
                      {job.error_message && (
                        <span className="text-rose-400 flex items-center gap-1 font-mono text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {job.error_message}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress info */}
                  <div className="w-full lg:w-72 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">
                        {job.completed_requests} / {job.total_requests} requests
                      </span>
                      <span className="text-white font-semibold">{pct}%</span>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          job.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : job.status === "FAILED"
                            ? "bg-rose-500"
                            : "bg-indigo-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400">{job.successful_requests} passed</span>
                      {job.failed_requests > 0 && (
                        <span className="text-rose-400">{job.failed_requests} failed</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {canRetry && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={retryingJobId === job.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors disabled:opacity-50"
                        title="Retry failed attempts without repeating successful evaluations"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${
                            retryingJobId === job.id ? "animate-spin" : ""
                          }`}
                        />
                        <span>{retryingJobId === job.id ? "Retrying..." : "Retry Failed"}</span>
                      </button>
                    )}

                    <Link
                      href={`/benchmarks/${job.id}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                    >
                      <span>View Results</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Launch Benchmark Wizard Modal */}
      {isLaunching && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Launch Benchmark Execution</h3>
              <button
                onClick={() => setIsLaunching(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunch} className="space-y-4">
              {/* Dataset selection */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Target Dataset Suite
                </label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.test_case_count} cases) - v{d.version}
                    </option>
                  ))}
                </select>
              </div>

              {/* Providers multi-select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Select Models ({selectedProviders.length}/{providers.length})
                  </label>
                  <button
                    type="button"
                    onClick={selectAllProviders}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Select All
                  </button>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
                  {providers.map((p) => {
                    const isChecked = selectedProviders.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProviderSelection(p.id)}
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? "bg-indigo-600/10 text-white" : "text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span className="text-xs font-medium">{p.name}</span>
                          {p.is_mock && <Badge variant="mock" />}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          ~{p.simulated_latency_ms}ms
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Concurrency setting */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-medium text-slate-300">Worker Concurrency</label>
                  <span className="font-mono text-indigo-400">{concurrency} parallel requests</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Evaluates requests concurrently using background worker async tasks.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLaunching(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md shadow-indigo-600/30"
                >
                  {submitting ? "Launching..." : "Start Benchmark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
