export function DemoControls({
  busy,
  canRun,
  canMoveMatch,
  onRun,
  onMoveMatch,
  onRefresh
}: {
  busy: boolean;
  canRun: boolean;
  canMoveMatch: boolean;
  onRun: () => void;
  onMoveMatch: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2 shadow-2xl shadow-black/20 backdrop-blur">
      <button
        disabled={busy || !canRun}
        onClick={onRun}
        title={!canRun ? "Connect Butterbase, Evermind, and Nebius first." : undefined}
        className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20"
      >
        Run Demo Analysis
      </button>
      <button
        disabled={busy || !canMoveMatch}
        onClick={onMoveMatch}
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-400/40"
      >
        Move Match to 90 Minutes
      </button>
      <button
        disabled={busy}
        onClick={onRefresh}
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500"
      >
        Refresh Vendors
      </button>
    </div>
  );
}
