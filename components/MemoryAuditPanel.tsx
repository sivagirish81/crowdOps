import type { AuditEvent, MemoryRecord } from "../lib/types";

export function MemoryAuditPanel({
  memories,
  auditEvents,
  learnedMemory
}: {
  memories: MemoryRecord[];
  auditEvents: AuditEvent[];
  learnedMemory?: MemoryRecord;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-700">Learning Loop</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Memory + Audit</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">Evermind Retrieved</p>
          <div className="space-y-3">
            {memories.length ? memories.map((memory) => (
              <div key={memory.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="break-words text-sm font-bold text-slate-950">{memory.title}</p>
                <p className="text-pretty mt-2 break-words text-xs leading-5 text-slate-600">{memory.content}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No memories retrieved yet.</p>}
          </div>
          {learnedMemory ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-700">New Evermind Memory</p>
              <p className="text-pretty mt-2 break-words text-xs leading-5 text-slate-700">{learnedMemory.content}</p>
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Butterbase Audit</p>
          <div className="space-y-3">
            {auditEvents.length ? auditEvents.map((event) => (
              <div key={event.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="break-words text-sm font-bold text-slate-950">{event.eventType}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{event.channel}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{event.actor}</p>
              </div>
            )) : <p className="text-sm text-slate-400">Audit events appear after plan generation and approval.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
