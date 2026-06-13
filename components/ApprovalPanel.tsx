export function ApprovalPanel({
  disabled,
  onApprove,
  onReject,
  onDraft
}: {
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDraft: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Human in the Loop</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Approval Flow</h2>
          <p className="mt-2 text-sm text-slate-500">Approvals update Butterbase actions, write an audit log, and add a learned Evermind memory.</p>
        </div>
      <div className="flex flex-wrap gap-3">
        <button
          disabled={disabled}
          onClick={onApprove}
          className="rounded-full bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
        >
          Approve All
        </button>
        <button disabled={disabled} onClick={onReject} className="rounded-full border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700">
          Reject
        </button>
        <button disabled={disabled} onClick={onDraft} className="rounded-full border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm">
          Save Draft
        </button>
      </div>
      </div>
    </section>
  );
}
