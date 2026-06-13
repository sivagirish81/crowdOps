import type { MatchEvent, MemoryRecord, RetrievedPolicy, Signal } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

function signalBySource(signals: Signal[], source: Signal["source"]) {
  return signals.find((signal) => signal.source === source);
}

function severityBadge(severity?: Signal["severity"]) {
  const tone =
    severity === "critical" || severity === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : severity === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {severity ?? "waiting"}
    </span>
  );
}

export function SignalIntelligenceStrip({
  match,
  signals,
  policies,
  memories
}: {
  match?: MatchEvent;
  signals: Signal[];
  policies: RetrievedPolicy[];
  memories: MemoryRecord[];
}) {
  const weather = signalBySource(signals, "weather");
  const news = signalBySource(signals, "news");
  const transit = signalBySource(signals, "transit");
  const topPolicy = policies[0];
  const topMemory = memories[0];

  const cards = [
    {
      title: "Match",
      body: match ? `${match.homeTeam} vs ${match.awayTeam}` : "Waiting for match",
      meta: match ? `${match.expectedDemand.replace("_", " ")} demand` : "Run analysis",
      badge: <SourceBadge source="world_cup_schedule" />
    },
    {
      title: "Weather",
      body: weather?.summary ?? "Signals will appear here after CrowdOps starts processing.",
      meta: "Open-Meteo",
      badge: severityBadge(weather?.severity)
    },
    {
      title: "News / Transit",
      body: news?.summary ?? transit?.summary ?? "News and optional GTFS signals pending.",
      meta: transit?.summary.includes("not configured") ? "GTFS optional" : "GDELT + GTFS",
      badge: severityBadge(news?.severity ?? transit?.severity)
    },
    {
      title: "Butterbase RAG",
      body: topPolicy?.title ?? "Operating policies retrieved from Butterbase RAG.",
      meta: `${policies.length} policies`,
      badge: <SourceBadge source="butterbase_rag" />
    },
    {
      title: "Evermind",
      body: topMemory?.title ?? "Similar event memories retrieved from Evermind.",
      meta: `${memories.length} memories`,
      badge: <SourceBadge source="evermind_memory" />
    }
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">Signal Intelligence</h2>
          <p className="text-sm text-slate-500">The context that grounds the operating plan.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <article key={card.title} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.title}</p>
              {card.badge}
            </div>
            <p className="text-pretty text-sm font-bold leading-5 text-slate-900">{card.body}</p>
            <p className="mt-2 text-xs text-slate-500">{card.meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
