type Status = "ok" | "error" | "missing";

const tone: Record<Status, { dot: string; label: string; border: string; bg: string }> = {
  ok: {
    dot: "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.7)]",
    label: "Connected",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/10"
  },
  missing: {
    dot: "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.55)]",
    label: "Missing",
    border: "border-amber-400/20",
    bg: "bg-amber-400/10"
  },
  error: {
    dot: "bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.55)]",
    label: "Error",
    border: "border-red-400/20",
    bg: "bg-red-400/10"
  }
};

export function StatusPill({ label, status }: { label: string; status: Status }) {
  const style = tone[status];

  return (
    <div
      title={`${label}: ${style.label}`}
      className={`flex items-center gap-2 rounded-full border ${style.border} ${style.bg} px-3 py-1.5`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className="text-xs font-semibold text-slate-200">{label}</span>
    </div>
  );
}
