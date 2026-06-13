import type { MemoryRecord } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

export function EvermindLearningPanel({
  memories,
  learnedMemory
}: {
  memories: MemoryRecord[];
  learnedMemory?: MemoryRecord;
}) {
  const visible = memories.slice(0, 3);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-slate-950">Evermind Learning Loop</h2>
        <p className="mt-1 text-sm text-slate-500">The next match day starts smarter.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {visible.length > 0 ? (
          visible.map((memory) => (
            <article key={memory.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <SourceBadge source="evermind_memory" />
              </div>
              <h3 className="text-pretty text-sm font-extrabold leading-5 text-slate-950">{memory.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{memory.content}</p>
              {memory.tags.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {memory.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-3">
            No memories retrieved yet. Evermind context appears after analysis.
          </div>
        )}
      </div>

      {learnedMemory ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-800">New learned memory</p>
          <p className="mt-2 text-pretty text-xs leading-5 text-violet-700">{learnedMemory.content}</p>
        </div>
      ) : null}
    </section>
  );
}
