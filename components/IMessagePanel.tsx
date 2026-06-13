import type { OpsPlan } from "../lib/types";

export function IMessagePanel({
  plan,
  approved,
  photonStatus
}: {
  plan?: OpsPlan;
  approved: boolean;
  photonStatus: "ok" | "error" | "missing";
}) {
  const connected = photonStatus === "ok";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl shadow-black/20">
      <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-cyan-300">Photon iMessage Agent</p>
            <h2 className="mt-1 text-lg font-bold text-white">Live operator interface</h2>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              connected
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-300"
            }`}
          >
            {connected ? "iMessage connected" : "Photon backup mode"}
          </span>
        </div>
      </div>
      <div className="space-y-4 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_45%)] p-4">
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] font-semibold text-slate-400">
            World Cup Ops Thread
          </span>
        </div>
        <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-blue-500 p-4 text-sm leading-6 text-white shadow-lg shadow-blue-500/20">
          Analyze Brazil vs Morocco for my sports bar.
        </div>
        <div className="max-w-[94%] rounded-2xl rounded-bl-md border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-xl">
          {plan ? (
            <>
              <p className="break-words font-bold">CrowdOps Risk: {plan.riskLevel.toUpperCase()} {plan.riskScore}/100</p>
              <ul className="mt-3 space-y-1 text-slate-300">
                {plan.reasoning.slice(0, 4).map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
              <p className="mt-3 text-slate-400">Reply “approve all”, “approve 1”, or “reject”.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">CrowdOps is ready.</p>
              <p className="mt-2 text-slate-400">
                {connected
                  ? "Run the demo analysis or text the agent through iMessage."
                  : "Photon not connected — dashboard controls are available for backup."}
              </p>
            </>
          )}
        </div>
        {approved ? (
          <div className="max-w-[94%] rounded-2xl rounded-bl-md border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
            Approved. Logged in Butterbase and saved to Evermind. The next match day starts smarter.
          </div>
        ) : null}
      </div>
    </section>
  );
}
