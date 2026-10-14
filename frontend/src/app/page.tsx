"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Zap,
  Target,
  DollarSign,
  Cpu,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  PlaySquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { DashboardOverview } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function OverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { error, success } = useToast();

  const fetchOverview = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getDashboardOverview();
      setData(res);
    } catch (err: any) {
      error(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => fetchOverview(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleProvider = async (id: string) => {
    try {
      await api.toggleProvider(id);
      success("Provider status updated");
      fetchOverview();
    } catch (err: any) {
      error(err.message || "Failed to toggle provider");
    }
  };

  const chartData =
    data?.provider_breakdown.map((p) => ({
      name: p.name.replace("Mock ", "").replace("Provider", "").trim(),
      quality: Math.round(p.avg_quality_score * 100),
      latency: Math.round(p.avg_latency_ms),
      successRate: Math.round(p.success_rate * 100),
      evaluations: p.total_evaluations,
    })) || [];

  return (
    <AppShell
      title="Fleet Overview & Analytics"
      subtitle="Enterprise multi-objective evaluation engine & automated routing metrics"
    >
      {/* Top Banner if no benchmark jobs exist yet */}
      {data && !data.has_benchmark_data && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-indigo-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No Benchmark Evaluations Yet</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Seed baseline datasets and launch your first evaluation to unlock Pareto routing, latency matrices, and cost analytics.
              </p>
            </div>
          </div>
          <Link
            href="/benchmarks"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 shrink-0"
          >
            <PlaySquare className="w-4 h-4" />
            <span>Launch Benchmark</span>
          </Link>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evaluations */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Evaluations Run</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {loading ? "..." : data?.total_evaluations ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              across {data?.total_benchmark_jobs ?? 0} runs
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-mono">
              {data?.successful_evaluations ?? 0} success
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-mono">
              {data?.failed_evaluations ?? 0} failed
            </span>
          </div>
        </div>

        {/* Average Quality Score */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Quality Score</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {loading
                ? "..."
                : `${Math.round((data?.average_quality_score ?? 0) * 100)}%`}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              normalized
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((data?.average_quality_score ?? 0) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Average Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {loading ? "..." : `${Math.round(data?.average_latency_ms ?? 0)}`}
            </span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Badge variant="provenance" label="measured wall-clock" />
          </div>
        </div>

        {/* Active Providers */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Model Fleet</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {loading
                ? "..."
                : `${data?.active_providers_count ?? 0}/${
                    data?.total_providers_count ?? 0
                  }`}
            </span>
            <span className="text-xs text-slate-400">online</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Datasets: {data?.datasets_count ?? 0}</span>
            <Link
              href="/providers"
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              Configure <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality Score by Provider Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Quality vs Latency Breakdown</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-metric comparison normalized across all completed evaluations
              </p>
            </div>
            <button
              onClick={() => fetchOverview(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No benchmark evaluations recorded yet</p>
              <p className="text-xs text-slate-600 mt-1">Run a benchmark to generate quality and latency visual data</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(value: any, name: any) => [
                      name === "quality" ? `${value}%` : `${value} ms`,
                      name === "quality" ? "Quality Score" : "Average Latency",
                    ]}
                  />
                  <Bar dataKey="quality" fill="#6366f1" radius={[6, 6, 0, 0]} name="quality">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.quality > 80
                            ? "#10b981"
                            : entry.quality > 50
                            ? "#6366f1"
                            : "#f59e0b"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> High Quality (&gt;80%)
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block ml-3" /> Moderate (&gt;50%)
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block ml-3" /> Lower (&lt;50%)
            </span>
            <Link href="/compare" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
              Deep Compare <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Intelligent Routing Quick CTA & Explainability card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Zap className="w-4 h-4" />
              <span>Smart Model Routing</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Pareto-Optimal Router</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Dynamically select the optimal LLM based on multi-objective constraints: lowest cost, minimum latency, strict quality thresholds, and required capabilities.
            </p>

            <div className="mt-6 space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Fast Llama 3B Mock</span>
                  <span className="text-emerald-400 font-mono">120ms • $0.0002</span>
                </div>
                <p className="text-[11px] text-slate-400">Optimal for high-throughput arithmetic & simple classification</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Deep Reasoner 70B Mock</span>
                  <span className="text-indigo-400 font-mono">850ms • $0.0030</span>
                </div>
                <p className="text-[11px] text-slate-400">Optimal for strict JSON schemas & multi-step deductive logic</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              href="/recommendations"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Run Routing Simulator</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Provider Fleet Status & Recent Benchmarks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Fleet Status */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Model Fleet Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Active providers and simulation properties</p>
            </div>
            <Link
              href="/providers"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.provider_breakdown.map((provider) => (
              <div
                key={provider.id}
                className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{provider.name}</span>
                      {provider.is_mock && <Badge variant="mock" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {provider.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} variant="capability" label={cap} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono text-slate-200">
                      {Math.round(provider.avg_latency_ms)} ms
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {Math.round(provider.success_rate * 100)}% success
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleProvider(provider.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      provider.is_enabled ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                    title={provider.is_enabled ? "Disable Provider" : "Enable Provider"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        provider.is_enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Benchmark Jobs */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Recent Benchmark Runs</h2>
                <p className="text-xs text-slate-400 mt-0.5">Execution logs, request states, and results</p>
              </div>
              <Link
                href="/benchmarks"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.recent_jobs.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <PlaySquare className="w-7 h-7 mb-2 opacity-50" />
                <p className="text-sm">No benchmark executions yet</p>
                <Link
                  href="/benchmarks"
                  className="text-xs text-indigo-400 hover:underline mt-1"
                >
                  Start your first benchmark run
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.recent_jobs.slice(0, 4).map((job) => {
                  const pct =
                    job.total_requests > 0
                      ? Math.round((job.completed_requests / job.total_requests) * 100)
                      : 0;
                  return (
                    <Link
                      key={job.id}
                      href={`/benchmarks/${job.id}`}
                      className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 hover:bg-slate-900/60 transition-all block group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                            {job.dataset_name || `Job #${job.id.substring(0, 8)}`}
                          </span>
                          <Badge status={job.status} />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>
                            {job.completed_requests}/{job.total_requests} requests
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono">
                            {job.successful_requests} ok
                          </span>
                          {job.failed_requests > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-rose-400 font-mono">
                                {job.failed_requests} err
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="w-20 text-right">
                        <div className="text-xs font-mono text-slate-300 mb-1">{pct}%</div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              job.status === "COMPLETED"
                                ? "bg-emerald-500"
                                : job.status === "FAILED"
                                ? "bg-rose-500"
                                : "bg-sky-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Automated in-process async worker with transactional claim locks</span>
            <Link
              href="/benchmarks"
              className="text-xs font-medium text-slate-300 hover:text-white"
            >
              Launch new run &rarr;
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
