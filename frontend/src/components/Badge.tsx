import React from "react";

interface BadgeProps {
  variant?: "status" | "mock" | "provenance" | "result" | "neutral" | "capability";
  status?: string;
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  status,
  label,
  className = "",
}) => {
  const displayLabel = label || status || "";

  if (variant === "mock" || displayLabel.toLowerCase() === "mock") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 ${className}`}
        title="Deterministic mock provider. Latency and cost values are simulated."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        Simulated Mock
      </span>
    );
  }

  if (variant === "provenance") {
    const prov = displayLabel.toLowerCase();
    let style = "bg-slate-800 text-slate-300 border-slate-700";
    if (prov === "simulated") style = "bg-amber-500/10 text-amber-300 border-amber-500/25";
    if (prov === "estimated") style = "bg-sky-500/10 text-sky-300 border-sky-500/25";
    if (prov === "measured") style = "bg-emerald-500/10 text-emerald-300 border-emerald-500/25";
    if (prov === "unknown") style = "bg-slate-800/80 text-slate-400 border-slate-700/60";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${style} ${className}`}>
        {displayLabel}
      </span>
    );
  }

  if (variant === "result") {
    const isPassed = status === "true" || displayLabel.toLowerCase() === "passed" || displayLabel.toLowerCase() === "success";
    return isPassed ? (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 ${className}`}>
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Passed
      </span>
    ) : (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25 ${className}`}>
        <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Failed
      </span>
    );
  }

  if (variant === "capability") {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 ${className}`}>
        {displayLabel}
      </span>
    );
  }

  // Job Status
  const st = (status || displayLabel).toUpperCase();
  let statusStyle = "bg-slate-800 text-slate-300 border-slate-700";
  let pulseDot = null;

  if (st === "QUEUED") {
    statusStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    pulseDot = <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>;
  } else if (st === "RUNNING") {
    statusStyle = "bg-sky-500/10 text-sky-400 border-sky-500/30";
    pulseDot = <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>;
  } else if (st === "COMPLETED") {
    statusStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    pulseDot = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>;
  } else if (st === "FAILED") {
    statusStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    pulseDot = <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${statusStyle} ${className}`}>
      {pulseDot}
      {st}
    </span>
  );
};
