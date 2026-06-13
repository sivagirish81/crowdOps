import type { RecommendedAction } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

function approvalLabel(action: RecommendedAction) {
  return action.requiresApproval ? "Approval required" : "No approval";
}

export function ActionCard({ action, index }: { action: RecommendedAction; index: number }) {
  return (
    <article className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/10">
            {index + 1}
          </div>
          <div className="min-w-0">
            <h4 className="text-pretty text-base font-extrabold leading-6 text-slate-950">{action.title}</h4>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{action.owner}</p>
          </div>
        </div>
      </div>

      <p className="text-pretty text-sm leading-6 text-slate-600">{action.rationale}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          {action.urgency.replaceAll("_", " ")}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            action.requiresApproval
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {approvalLabel(action)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {action.sourceBasis.map((source) => (
          <SourceBadge key={source} source={source} />
        ))}
      </div>
    </article>
  );
}
