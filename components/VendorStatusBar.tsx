import type { VendorStatus } from "../lib/types";

function Dot({ status }: { status: "ok" | "error" | "missing" }) {
  const color = status === "ok" ? "bg-emerald-500" : status === "missing" ? "bg-amber-500" : "bg-red-500";
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

export function VendorStatusBar({ status }: { status: VendorStatus }) {
  const entries = [
    ["Butterbase", status.butterbase],
    ["Butterbase RAG", status.butterbaseRag],
    ["Evermind", status.evermind],
    ["Nebius", status.nebius],
    ["Photon", status.photon]
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mr-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.20em] text-slate-500">
        Vendor Fabric
      </div>
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
          <Dot status={value} />
          <span className="font-semibold text-slate-800">{label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{value}</span>
        </div>
      ))}
    </div>
  );
}
