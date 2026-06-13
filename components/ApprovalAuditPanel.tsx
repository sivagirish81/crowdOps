import type { AuditEvent, MemoryRecord } from "../lib/types";

export function ApprovalAuditPanel({
  disabled,
  approved,
  auditEvents,
  learnedMemory,
  onApprove,
  onReject,
  onDraft
}: {
  disabled: boolean;
  approved: boolean;
  auditEvents: AuditEvent[];
  learnedMemory?: MemoryRecord;
  onApprove: () => void;
  onReject: () => void;
  onDraft: () => void;
}) {
  const rows = auditEvents.slice(0, 5);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">Human-in-the-loop Approval</h2>
          <p className="mt-1 text-sm text-slate-500">Approvals activate the operating plan and record the decision trail.</p>
        </div>
        {approved ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Approved
          </span>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          disabled={disabled}
          onClick={onApprove}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
        >
          Approve All
        </button>
        <button
          disabled={disabled}
          onClick={onReject}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
        >
          Reject
        </button>
        <button
          disabled={disabled}
          onClick={onDraft}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
        >
          Save Draft
        </button>
      </div>

      {approved ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-bold text-emerald-800">Approved via dashboard</p>
          <p className="mt-1 text-xs leading-5 text-emerald-700">
            Approved actions are queued for the team, customer messaging is prepared, and future match-day guidance is updated.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {rows.length > 0 ? (
          rows.map((event) => (
            <div key={event.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                {event.eventType.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">{event.eventType}</p>
                <p className="text-xs text-slate-500">{event.actor} · {event.channel}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Audit events appear after plan generation and approval.
          </div>
        )}
      </div>

      {learnedMemory ? <p className="mt-3 text-xs text-slate-500">Latest memory: {learnedMemory.title}</p> : null}
    </section>
  );
}
