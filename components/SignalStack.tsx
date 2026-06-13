import type { RetrievedPolicy, Signal } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

const severityClass: Record<Signal["severity"], string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-300 bg-red-100 text-red-800"
};

export function SignalStack({ signals, policies }: { signals: Signal[]; policies: RetrievedPolicy[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Context Stack</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Live Signals + Butterbase RAG</h2>
        </div>
        <p className="text-sm text-slate-400">{signals.length} signals, {policies.length} policies retrieved</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {signals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            Signals will appear after analysis starts.
          </div>
        ) : null}
        {signals.map((signal) => (
          <div key={signal.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <SourceBadge source={signal.source} />
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${severityClass[signal.severity]}`}>{signal.severity}</span>
            </div>
            <p className="text-pretty break-words text-sm leading-6 text-slate-600">{signal.summary}</p>
          </div>
        ))}
        {policies.map((policy) => (
          <div key={policy.id} className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2">
              <SourceBadge source="butterbase_rag" />
            </div>
            <p className="break-words text-sm font-bold text-slate-950">{policy.title}</p>
            <p className="text-pretty mt-2 break-words text-xs leading-5 text-slate-600">{policy.excerpt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
