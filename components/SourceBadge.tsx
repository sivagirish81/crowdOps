import type { SignalSource } from "../lib/types";

const labels: Record<SignalSource, string> = {
  world_cup_schedule: "World Cup",
  weather: "Weather",
  transit: "Transit",
  news: "News",
  butterbase_rag: "Butterbase RAG",
  evermind_memory: "Evermind",
  nebius_inference: "Nebius",
  photon_imessage: "Photon"
};

export function SourceBadge({ source }: { source: SignalSource }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {labels[source]}
    </span>
  );
}
