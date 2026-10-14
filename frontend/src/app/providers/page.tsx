"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  Sliders,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  DollarSign,
  ShieldAlert,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { api } from "@/lib/api";
import { ProviderConfig } from "@/lib/types";
import { useToast } from "@/components/Toast";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<ProviderConfig>>({
    name: "",
    identifier: "",
    provider_type: "mock",
    is_enabled: true,
    is_mock: true,
    capabilities: ["arithmetic"],
    simulated_latency_ms: 150,
    simulated_cost_per_1k_tokens: 0.0005,
    simulated_failure_rate: 0.0,
    timeout_seconds: 30,
    max_retries: 2,
  });

  const [capInput, setCapInput] = useState("");
  const { success, error, info } = useToast();

  const fetchProviders = async () => {
    try {
      const data = await api.listProviders();
      setProviders(data);
    } catch (err: any) {
      error(err.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.toggleProvider(id);
      setProviders((prev) => prev.map((p) => (p.id === id ? updated : p)));
      success(`Provider ${updated.name} ${updated.is_enabled ? "enabled" : "disabled"}`);
    } catch (err: any) {
      error(err.message || "Failed to toggle provider");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
      success(`Provider "${name}" removed`);
    } catch (err: any) {
      error(err.message || "Failed to delete provider");
    }
  };

  const openEdit = (p: ProviderConfig) => {
    setEditingProvider(p);
    setFormData({
      name: p.name,
      identifier: p.identifier,
      provider_type: p.provider_type,
      is_enabled: p.is_enabled,
      is_mock: p.is_mock,
      capabilities: [...p.capabilities],
      simulated_latency_ms: p.simulated_latency_ms,
      simulated_cost_per_1k_tokens: p.simulated_cost_per_1k_tokens,
      simulated_failure_rate: p.simulated_failure_rate,
      timeout_seconds: p.timeout_seconds,
      max_retries: p.max_retries,
    });
    setCapInput("");
  };

  const openCreate = () => {
    setIsCreating(true);
    setFormData({
      name: "",
      identifier: "",
      provider_type: "mock",
      is_enabled: true,
      is_mock: true,
      capabilities: ["arithmetic"],
      simulated_latency_ms: 150,
      simulated_cost_per_1k_tokens: 0.0005,
      simulated_failure_rate: 0.0,
      timeout_seconds: 30,
      max_retries: 2,
    });
    setCapInput("");
  };

  const handleAddCapability = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && capInput.trim()) {
      e.preventDefault();
      const val = capInput.trim().toLowerCase();
      if (!formData.capabilities?.includes(val)) {
        setFormData({ ...formData, capabilities: [...(formData.capabilities || []), val] });
      }
      setCapInput("");
    }
  };

  const handleRemoveCapability = (capToRemove: string) => {
    setFormData({
      ...formData,
      capabilities: formData.capabilities?.filter((c) => c !== capToRemove) || [],
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProvider) {
        const updated = await api.updateProvider(editingProvider.id, formData);
        setProviders((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        success(`Provider "${updated.name}" updated successfully`);
        setEditingProvider(null);
      } else {
        const created = await api.createProvider(formData);
        setProviders((prev) => [...prev, created]);
        success(`Provider "${created.name}" created successfully`);
        setIsCreating(false);
      }
    } catch (err: any) {
      error(err.message || "Failed to save provider configuration");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Model Provider Management"
      subtitle="Configure model registry, simulation parameters, latency profiles, and fault injection"
    >
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Registered Providers</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage mock models and live inference endpoints with transparent provenance tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProviders}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="Reload providers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Provider</span>
          </button>
        </div>
      </div>

      {/* Provider Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading provider configs...</span>
        </div>
      ) : providers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Providers Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click &quot;Seed Baseline Data&quot; in the header or &quot;Add Provider&quot; above to initialize mock models.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`p-5 rounded-2xl bg-slate-900/80 border transition-all flex flex-col justify-between ${
                p.is_enabled
                  ? "border-slate-800 hover:border-slate-700 shadow-lg shadow-black/20"
                  : "border-slate-800/40 opacity-70 bg-slate-950/40"
              }`}
            >
              <div>
                {/* Top card bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        p.is_enabled
                          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{p.name}</h3>
                      <p className="text-[11px] font-mono text-slate-400">{p.identifier}</p>
                    </div>
                  </div>

                  {/* Enable / Disable toggle switch */}
                  <button
                    onClick={() => handleToggle(p.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      p.is_enabled ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                    title={p.is_enabled ? "Enabled - Click to disable" : "Disabled - Click to enable"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        p.is_enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {p.is_mock && <Badge variant="mock" />}
                  <Badge
                    variant="neutral"
                    label={p.is_enabled ? "Active Fleet" : "Offline"}
                    className={
                      p.is_enabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }
                  />
                  <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                    type: {p.provider_type}
                  </span>
                </div>

                {/* Simulation properties metrics */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Latency Profile:
                    </span>
                    <span className="font-mono text-slate-200 font-medium">
                      ~{p.simulated_latency_ms} ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Cost / 1k Tokens:
                    </span>
                    <span className="font-mono text-slate-200 font-medium">
                      ${p.simulated_cost_per_1k_tokens.toFixed(5)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Fault Injection:
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        p.simulated_failure_rate > 0 ? "text-amber-400" : "text-slate-400"
                      }`}
                    >
                      {Math.round(p.simulated_failure_rate * 100)}% failure rate
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>Timeout: {p.timeout_seconds}s</span>
                    <span>Max Retries: {p.max_retries}</span>
                  </div>
                </div>

                {/* Capabilities Tags */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Model Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.capabilities.map((cap) => (
                      <Badge key={cap} variant="capability" label={cap} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => openEdit(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>

                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Delete provider"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {(editingProvider || isCreating) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingProvider ? `Configure: ${editingProvider.name}` : "Add New Provider"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update simulation parameters, timeouts, and multi-objective routing traits
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProvider(null);
                  setIsCreating(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Mock Fast Llama"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Identifier Key
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.identifier || ""}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    placeholder="e.g. mock-fast-llama"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Simulated Latency (ms)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    required
                    value={formData.simulated_latency_ms ?? 150}
                    onChange={(e) =>
                      setFormData({ ...formData, simulated_latency_ms: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Cost per 1k Tokens ($)
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    min="0"
                    required
                    value={formData.simulated_cost_per_1k_tokens ?? 0.0005}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        simulated_cost_per_1k_tokens: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Failure Rate (0 - 1)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.simulated_failure_rate ?? 0.0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        simulated_failure_rate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Timeout (sec)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.timeout_seconds ?? 30}
                    onChange={(e) =>
                      setFormData({ ...formData, timeout_seconds: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.max_retries ?? 2}
                    onChange={(e) =>
                      setFormData({ ...formData, max_retries: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Capabilities Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Capabilities (type and press Enter)
                </label>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap gap-1.5 items-center min-h-[42px]">
                  {formData.capabilities?.map((cap) => (
                    <span
                      key={cap}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    >
                      {cap}
                      <button
                        type="button"
                        onClick={() => handleRemoveCapability(cap)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={capInput}
                    onChange={(e) => setCapInput(e.target.value)}
                    onKeyDown={handleAddCapability}
                    placeholder={
                      formData.capabilities?.length ? "" : "e.g. arithmetic, json_schema..."
                    }
                    className="bg-transparent text-xs text-white focus:outline-none flex-1 min-w-[100px] px-1 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Common: arithmetic, reasoning, json_schema, extraction, compliance
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProvider(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingProvider ? "Save Changes" : "Create Provider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
