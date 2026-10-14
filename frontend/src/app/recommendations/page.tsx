"use client";

import React, { useState, useEffect } from "react";
import {
  GitBranch,
  Zap,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Cpu,
  Clock,
  DollarSign,
  Target,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { RecommendationResponse, ProviderCandidate, BenchmarkDataset } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function RecommendationsPage() {
  const [strategy, setStrategy] = useState("balanced");
  const [maxLatency, setMaxLatency] = useState<number | "">(1000);
  const [maxCost, setMaxCost] = useState<number | "">("");
  const [minQuality, setMinQuality] = useState<number>(0.6);
  const [requiredCapabilities, setRequiredCapabilities] = useState<string[]>([]);
  const [minSamples, setMinSamples] = useState<number>(1);

  // Weights for balanced strategy
  const [weights, setWeights] = useState({
    quality: 0.5,
    latency: 0.3,
    cost: 0.2,
  });

  const [datasets, setDatasets] = useState<BenchmarkDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { success, error, info } = useToast();

  const availableCapabilities = ["arithmetic", "reasoning", "json_schema", "compliance", "extraction"];

  useEffect(() => {
    api.listDatasets().then((d) => {
      setDatasets(d);
      if (d.length > 0) setSelectedDatasetId(d[0].id);
    });
  }, []);

  const toggleCapability = (cap: string) => {
    setRequiredCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSimulate = async () => {
    setLoading(true);
    info("Evaluating multi-objective Pareto routing criteria...");
    try {
      const constraints: any = {
        min_quality_score: minQuality,
        min_samples: minSamples,
        required_capabilities: requiredCapabilities,
      };
      if (maxLatency !== "") constraints.max_latency_ms = Number(maxLatency);
      if (maxCost !== "") constraints.max_cost_per_query = Number(maxCost);

      const res = await api.getRecommendation({
        strategy,
        constraints,
        weights: strategy === "balanced" ? weights : undefined,
        dataset_id: selectedDatasetId || undefined,
        persist_audit: true,
      });

      setRecommendation(res);
      if (res.is_successful) {
        success(`Optimal route identified: ${res.winner_provider_name}!`);
      } else {
        error(res.explanation || "No eligible model found meeting all constraints.");
      }
    } catch (err: any) {
      error(err.message || "Recommendation evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Intelligent Model Routing Simulator"
      subtitle="Pareto-optimal routing engine balancing quality, cost, latency constraints, and capability prerequisites"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Smart Routing Simulator</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Execute real-time constraint satisfaction and multi-objective Pareto optimization
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Constraints & Configuration Panel */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Routing Objectives
            </h3>
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Optimization Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "balanced", label: "Balanced (Pareto)" },
                { id: "highest_quality", label: "Highest Quality" },
                { id: "lowest_latency", label: "Lowest Latency" },
                { id: "lowest_cost", label: "Lowest Cost" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrategy(s.id)}
                  className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                    strategy === s.id
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dataset Scope */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Benchmark Dataset Context
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Datasets (Global Aggregate)</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.test_case_count} cases)
                </option>
              ))}
            </select>
          </div>

          {/* Sliders & Constraints */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            {/* Min Quality Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Min Quality Score:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {Math.round(minQuality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={minQuality}
                onChange={(e) => setMinQuality(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Max Latency */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Max Latency Budget (ms):</span>
                <span className="font-mono text-sky-400 font-semibold">
                  {maxLatency === "" ? "No Limit" : `${maxLatency} ms`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={maxLatency === "" ? 1500 : maxLatency}
                  onChange={(e) => setMaxLatency(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setMaxLatency(maxLatency === "" ? 1000 : "")}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  {maxLatency === "" ? "Set" : "Clear"}
                </button>
              </div>
            </div>

            {/* Max Cost Budget */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Max Cost / Query ($):</span>
                <span className="font-mono text-indigo-400 font-semibold">
                  {maxCost === "" ? "No Limit" : `$${maxCost}`}
                </span>
              </div>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="e.g. 0.001"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Required Capabilities Tags */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Required Capabilities
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableCapabilities.map((cap) => {
                const isSelected = requiredCapabilities.includes(cap);
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-950/80 text-slate-400 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {cap}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Balanced Weights (if balanced strategy selected) */}
          {strategy === "balanced" && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Pareto Objective Weights
              </span>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Quality Weight:</span>
                  <span className="font-mono">{Math.round(weights.quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={weights.quality}
                  onChange={(e) => setWeights({ ...weights, quality: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 h-1"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Latency Weight:</span>
                  <span className="font-mono">{Math.round(weights.latency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={weights.latency}
                  onChange={(e) => setWeights({ ...weights, latency: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 h-1"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Cost Weight:</span>
                  <span className="font-mono">{Math.round(weights.cost * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={weights.cost}
                  onChange={(e) => setWeights({ ...weights, cost: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 h-1"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>{loading ? "Computing Optimal Route..." : "Evaluate Optimal Route"}</span>
          </button>
        </div>

        {/* Right Column: Routing Recommendation & Explainability */}
        <div className="lg:col-span-2 space-y-6">
          {!recommendation ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 flex flex-col items-center justify-center min-h-[400px]">
              <GitBranch className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-white">No Simulation Run Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Adjust the constraint sliders and click &quot;Evaluate Optimal Route&quot; to test model selection and examine decision audit traces.
              </p>
            </div>
          ) : (
            <>
              {/* Winner Provider Spotlight Card */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  recommendation.is_successful
                    ? "bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/40 shadow-xl shadow-indigo-950/30"
                    : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                        recommendation.is_successful
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                          {recommendation.is_successful ? "Optimal Recommended Model" : "Routing Unsuccessful"}
                        </span>
                        {recommendation.is_successful && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Strategy: {recommendation.strategy}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                        {recommendation.winner_provider_name || "No Eligible Model"}
                      </h3>
                    </div>
                  </div>

                  {recommendation.audit_id && (
                    <span className="text-[10px] font-mono text-slate-400 px-2 py-1 rounded-md bg-slate-950/60 border border-slate-800">
                      Audit: #{recommendation.audit_id.substring(0, 8)}
                    </span>
                  )}
                </div>

                {/* Explainability Narrative */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Decision Explanation:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-sans">
                    {recommendation.explanation}
                  </p>
                  {recommendation.trade_offs && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{recommendation.trade_offs}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Evaluated Candidates Breakdown Table */}
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-4">
                  Candidates Evaluated ({recommendation.candidates_evaluated.length})
                </h4>

                <div className="space-y-3">
                  {recommendation.candidates_evaluated.map((cand) => (
                    <div
                      key={cand.provider_id}
                      className={`p-4 rounded-xl border transition-all ${
                        cand.is_eligible
                          ? cand.provider_id === recommendation.winner_provider_id
                            ? "bg-indigo-600/10 border-indigo-500/40"
                            : "bg-slate-950/40 border-slate-800/80"
                          : "bg-rose-950/10 border-rose-900/30 opacity-75"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {cand.provider_name}
                            </span>
                            {cand.provider_id === recommendation.winner_provider_id && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500 text-white">
                                WINNER
                              </span>
                            )}
                            {cand.is_eligible ? (
                              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Filtered Out
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                            <span>Quality: {Math.round(cand.avg_quality * 100)}%</span>
                            <span>•</span>
                            <span>Latency: {Math.round(cand.avg_latency_ms)}ms</span>
                            <span>•</span>
                            <span>
                              Cost: ${cand.avg_cost_usd ? cand.avg_cost_usd.toFixed(6) : "0.000000"}
                            </span>
                            <span>•</span>
                            <span>Score: {cand.composite_score.toFixed(3)}</span>
                          </div>
                        </div>

                        {/* Rejection reasons if filtered */}
                        {!cand.is_eligible && cand.rejection_reasons?.length > 0 && (
                          <div className="text-right text-xs text-rose-400 font-mono">
                            {cand.rejection_reasons.map((r, i) => (
                              <div key={i}>{r}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
