"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  Code,
  FileText,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { BenchmarkDataset, TestCase } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<BenchmarkDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<BenchmarkDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({});

  // Modals
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New dataset form
  const [newDataset, setNewDataset] = useState({
    name: "",
    description: "",
    version: "1.0.0",
  });

  // New test case form
  const [newCase, setNewCase] = useState<Partial<TestCase>>({
    name: "",
    task_type: "arithmetic",
    prompt: "",
    expected_output: "",
    evaluator_type: "exact_match",
    evaluator_config: { strip_whitespace: true, case_sensitive: false },
    required_capabilities: ["arithmetic"],
    weight: 1.0,
  });

  const [caseConfigJson, setCaseConfigJson] = useState(
    JSON.stringify({ strip_whitespace: true, case_sensitive: false }, null, 2)
  );
  const [capInput, setCapInput] = useState("");
  const { success, error, info } = useToast();

  const fetchDatasets = async (selectId?: string) => {
    try {
      const data = await api.listDatasets();
      setDatasets(data);
      if (data.length > 0) {
        const toSelect = selectId
          ? data.find((d) => d.id === selectId) || data[0]
          : selectedDataset
          ? data.find((d) => d.id === selectedDataset.id) || data[0]
          : data[0];
        fetchDatasetDetails(toSelect.id);
      } else {
        setSelectedDataset(null);
      }
    } catch (err: any) {
      error(err.message || "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetDetails = async (id: string) => {
    try {
      const details = await api.getDataset(id);
      setSelectedDataset(details);
    } catch (err: any) {
      error(err.message || "Failed to load dataset details");
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const toggleExpand = (caseId: string) => {
    setExpandedCases((prev) => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.createDataset(newDataset);
      success(`Dataset "${created.name}" created`);
      setIsCreatingDataset(false);
      setNewDataset({ name: "", description: "", version: "1.0.0" });
      fetchDatasets(created.id);
    } catch (err: any) {
      error(err.message || "Failed to create dataset");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDataset = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete dataset "${name}" and all its test cases?`))
      return;
    try {
      await api.deleteDataset(id);
      success(`Dataset "${name}" deleted`);
      fetchDatasets();
    } catch (err: any) {
      error(err.message || "Failed to delete dataset");
    }
  };

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;
    setSubmitting(true);
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(caseConfigJson);
      } catch {
        throw new Error("Invalid JSON in evaluator config");
      }

      await api.addTestCase(selectedDataset.id, {
        ...newCase,
        evaluator_config: parsedConfig,
      });

      success("Test case added successfully");
      setIsCreatingCase(false);
      setNewCase({
        name: "",
        task_type: "arithmetic",
        prompt: "",
        expected_output: "",
        evaluator_type: "exact_match",
        required_capabilities: ["arithmetic"],
        weight: 1.0,
      });
      fetchDatasetDetails(selectedDataset.id);
    } catch (err: any) {
      error(err.message || "Failed to add test case");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm("Delete this test case?")) return;
    try {
      await api.deleteTestCase(caseId);
      success("Test case deleted");
      if (selectedDataset) fetchDatasetDetails(selectedDataset.id);
    } catch (err: any) {
      error(err.message || "Failed to delete test case");
    }
  };

  const handleEvaluatorChange = (type: string) => {
    let defaultConfig: any = {};
    if (type === "exact_match") {
      defaultConfig = { strip_whitespace: true, case_sensitive: false };
    } else if (type === "rule_based") {
      defaultConfig = { required_substrings: [], banned_substrings: [], min_length: 5 };
    } else if (type === "response_validity") {
      defaultConfig = { min_length: 10, max_length: 1000, reject_null_or_empty: true };
    } else if (type === "text_similarity") {
      defaultConfig = { threshold: 0.7, algorithm: "jaccard_and_seqmatch" };
    }
    setNewCase({ ...newCase, evaluator_type: type });
    setCaseConfigJson(JSON.stringify(defaultConfig, null, 2));
  };

  return (
    <AppShell
      title="Benchmark Datasets & Evaluation Test Cases"
      subtitle="Standardized prompt suites, deterministic golden outputs, and multi-algorithm evaluators"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Evaluation Datasets</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Curated prompt corpora with multi-algorithm evaluators and capability tags
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDatasets()}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreatingDataset(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Dataset</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading datasets...</span>
        </div>
      ) : datasets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
          <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Datasets Available</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click &quot;Seed Baseline Data&quot; in the navigation header to import the standard 10-prompt benchmark suite.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Datasets Sidebar */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Datasets ({datasets.length})
            </h3>
            <div className="space-y-2">
              {datasets.map((d) => {
                const isSelected = selectedDataset?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => fetchDatasetDetails(d.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-600/10 border-indigo-500/50 text-white shadow-md shadow-indigo-950/20"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold truncate">{d.name}</span>
                      {d.is_seeded && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Seeded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{d.test_case_count} test cases</span>
                      <span className="font-mono text-[11px]">v{d.version}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dataset Details & Test Cases */}
          <div className="lg:col-span-3 space-y-5">
            {selectedDataset && (
              <>
                {/* Dataset info card */}
                <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {selectedDataset.name}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        v{selectedDataset.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl">
                      {selectedDataset.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCreatingCase(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Test Case</span>
                    </button>
                    {!selectedDataset.is_seeded && (
                      <button
                        onClick={() =>
                          handleDeleteDataset(selectedDataset.id, selectedDataset.name)
                        }
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Test cases list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Test Cases ({selectedDataset.test_cases?.length || 0})
                    </h4>
                  </div>

                  {selectedDataset.test_cases?.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
                      No test cases in this dataset yet. Click &quot;Add Test Case&quot; to define prompts.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDataset.test_cases?.map((tc, idx) => {
                        const isExpanded = !!expandedCases[tc.id];
                        return (
                          <div
                            key={tc.id}
                            className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden hover:border-slate-700 transition-all"
                          >
                            {/* Case row summary */}
                            <div
                              onClick={() => toggleExpand(tc.id)}
                              className="p-4 flex items-center justify-between cursor-pointer select-none gap-4"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <button className="text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <span className="font-mono text-xs text-slate-500 w-5">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <h5 className="text-sm font-semibold text-white truncate">
                                    {tc.name}
                                  </h5>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[11px] font-mono text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                                      {tc.task_type}
                                    </span>
                                    <span className="text-[11px] font-mono text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                      evaluator: {tc.evaluator_type}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      weight: {tc.weight}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-1">
                                  {tc.required_capabilities.map((cap) => (
                                    <Badge key={cap} variant="capability" label={cap} />
                                  ))}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCase(tc.id);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                  title="Delete test case"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-3 text-xs">
                                <div>
                                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                                    Prompt:
                                  </span>
                                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                                    {tc.prompt}
                                  </pre>
                                </div>

                                {tc.expected_output && (
                                  <div>
                                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                                      Expected Golden Output:
                                    </span>
                                    <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                                      {tc.expected_output}
                                    </pre>
                                  </div>
                                )}

                                <div>
                                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                                    Evaluator Configuration:
                                  </span>
                                  <pre className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-indigo-300 text-[11px]">
                                    {JSON.stringify(tc.evaluator_config, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Dataset Modal */}
      {isCreatingDataset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Create Evaluation Dataset</h3>
              <button
                onClick={() => setIsCreatingDataset(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDataset} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={newDataset.name}
                  onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                  placeholder="e.g. Enterprise RAG & Tool Use Suite"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Version</label>
                <input
                  type="text"
                  required
                  value={newDataset.version}
                  onChange={(e) => setNewDataset({ ...newDataset, version: e.target.value })}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDataset.description}
                  onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
                  placeholder="Benchmark objectives, domain coverage, and scoring criteria..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingDataset(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Dataset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Test Case Modal */}
      {isCreatingCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Add Test Case</h3>
              <button
                onClick={() => setIsCreatingCase(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCase} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Test Name</label>
                  <input
                    type="text"
                    required
                    value={newCase.name || ""}
                    onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                    placeholder="e.g. Simple Math 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Task Type</label>
                  <input
                    type="text"
                    required
                    value={newCase.task_type || ""}
                    onChange={(e) => setNewCase({ ...newCase, task_type: e.target.value })}
                    placeholder="arithmetic, reasoning, etc"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Prompt</label>
                <textarea
                  rows={3}
                  required
                  value={newCase.prompt || ""}
                  onChange={(e) => setNewCase({ ...newCase, prompt: e.target.value })}
                  placeholder="Enter user prompt sent to LLMs..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Expected Golden Output (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newCase.expected_output || ""}
                  onChange={(e) => setNewCase({ ...newCase, expected_output: e.target.value })}
                  placeholder="Exact string or pattern to evaluate against..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Evaluator Type
                  </label>
                  <select
                    value={newCase.evaluator_type}
                    onChange={(e) => handleEvaluatorChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="exact_match">Exact Match</option>
                    <option value="rule_based">Rule-Based (Regex / Substring / JSON)</option>
                    <option value="response_validity">Response Validity</option>
                    <option value="text_similarity">Text Similarity (Jaccard)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={newCase.weight ?? 1.0}
                    onChange={(e) => setNewCase({ ...newCase, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Evaluator Config JSON
                </label>
                <textarea
                  rows={4}
                  value={caseConfigJson}
                  onChange={(e) => setCaseConfigJson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingCase(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Test Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
