import type { AgentTimelineEvent } from "../lib/types";

const statusClass: Record<AgentTimelineEvent["status"], string> = {
  pending: "border-slate-600 bg-slate-800",
  running: "border-cyan-300 bg-cyan-300 animate-pulse",
  complete: "border-emerald-400 bg-emerald-400",
  error: "border-red-400 bg-red-400"
};

export function AgentTimeline({ events }: { events: AgentTimelineEvent[] }) {
  return (
    <section className="h-full rounded-3xl border border-slate-800 bg-slate-900/85 p-4 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Live Agent Timeline</h2>
          <p className="mt-1 text-sm text-slate-400">End-to-end execution trace</p>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">Live</span>
      </div>
      <div className="relative space-y-1">
        <div className="absolute bottom-5 left-[15px] top-5 w-px bg-gradient-to-b from-cyan-300/50 via-slate-700 to-transparent" />
        {events.map((event) => (
          <div key={event.id} className="relative flex min-w-0 gap-4 rounded-2xl border border-transparent p-2.5 hover:border-slate-800 hover:bg-slate-950/50">
            <div className={`z-10 mt-1 h-4 w-4 rounded-full border-2 ${statusClass[event.status]}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="break-words text-sm font-semibold text-slate-100">{event.label}</p>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {event.status}
                </span>
              </div>
              {event.detail ? <p className="text-pretty mt-1 break-words text-xs leading-5 text-slate-500">{event.detail}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
