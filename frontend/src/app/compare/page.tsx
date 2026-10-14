"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart2,
  RefreshCw,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Clock,
  DollarSign,
  Target,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { ComparisonMatrixItem, BenchmarkDataset } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function ComparePage() {
  const [matrix, setMatrix] = useState<ComparisonMatrixItem[]>([]);
  const [datasets, setDatasets] = useState<BenchmarkDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const { error } = useToast();

  const loadData = async (datasetId?: string) => {
    setLoading(true);
    try {
      const [matrixData, datasetsData] = await Promise.all([
        api.getComparisonMatrix(datasetId ? { dataset_id: datasetId } : undefined),
        api.listDatasets(),
      ]);
      setMatrix(matrixData);
      setDatasets(datasetsData);
    } catch (err: any) {
      error(err.message || "Failed to load comparison matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDatasetChange = (id: string) => {
    setSelectedDatasetId(id);
    loadData(id || undefined);
  };

  const chartData = matrix.map((item) => ({
    name: item.provider_name.replace("Mock ", "").trim(),
    quality: Math.round(item.avg_quality * 100),
    latency: Math.round(item.avg_wall_clock_latency_ms),
    cost: item.avg_cost_usd ? Number((item.avg_cost_usd * 1000).toFixed(4)) : 0, // cost per 1k reqs in m$
    successRate: Math.round(item.success_rate * 100),
    passRate: Math.round(item.pass_rate * 100),
  }));

  return (
    <AppShell
      title="Provider Comparison Matrix"
      subtitle="Cross-model benchmark comparison across quality, latency, error tolerances, and unit costs"
    >
      {/* Top filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Cross-Model Comparison</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Normalized metrics across all recorded test case evaluations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Dataset Scope:</span>
            <select
              value={selectedDatasetId}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Datasets Combined</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadData(selectedDatasetId || undefined)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Generating comparison matrix...</span>
        </div>
      ) : matrix.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
          <BarChart2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Evaluation Data Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Launch a benchmark run first to generate comparative analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality vs Latency Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Quality vs Latency</h3>
                  <p className="text-xs text-slate-400">Higher quality, lower latency is ideal</p>
                </div>
                <Target className="w-4 h-4 text-indigo-400" />
              </div>

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
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => <span className="text-xs text-slate-300 capitalize">{val}</span>}
                    />
                    <Bar dataKey="quality" fill="#10b981" name="Quality (%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="passRate" fill="#6366f1" name="Pass Rate (%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latency Comparison Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Measured Latency Profile (ms)</h3>
                  <p className="text-xs text-slate-400">Average wall-clock response duration</p>
                </div>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                        color: "#f8fafc",
                      }}
                      formatter={(val: any) => [`${val} ms`, "Wall-clock Latency"]}
                    />
                    <Bar dataKey="latency" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Matrix Data Table */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
            <h3 className="text-base font-bold text-white mb-4">Detailed Metrics Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="pb-3 pl-2">Model Provider</th>
                    <th className="pb-3">Samples</th>
                    <th className="pb-3">Success Rate</th>
                    <th className="pb-3">Pass Rate</th>
                    <th className="pb-3">Avg Quality</th>
                    <th className="pb-3">Avg Latency</th>
                    <th className="pb-3">Avg Cost</th>
                    <th className="pb-3 pr-2">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {matrix.map((row) => (
                    <tr key={row.provider_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pl-2 font-sans font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{row.provider_name}</span>
                          {row.is_mock && <Badge variant="mock" />}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-300">{row.total_samples}</td>
                      <td className="py-3.5">
                        <span
                          className={
                            row.success_rate >= 0.9
                              ? "text-emerald-400 font-bold"
                              : row.success_rate >= 0.7
                              ? "text-amber-400 font-medium"
                              : "text-rose-400 font-bold"
                          }
                        >
                          {Math.round(row.success_rate * 100)}%
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-300">
                        {Math.round(row.pass_rate * 100)}%
                      </td>
                      <td className="py-3.5 text-emerald-400 font-bold">
                        {Math.round(row.avg_quality * 100)}%
                      </td>
                      <td className="py-3.5 text-sky-300">
                        {Math.round(row.avg_wall_clock_latency_ms)} ms
                      </td>
                      <td className="py-3.5 text-slate-300">
                        ${row.avg_cost_usd ? row.avg_cost_usd.toFixed(6) : "0.000000"}
                      </td>
                      <td className="py-3.5 pr-2">
                        <Badge variant="provenance" label={row.cost_provenance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
