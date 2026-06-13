"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentTimelineEvent, AuditEvent, LiveCommandState, MemoryRecord, VendorStatus } from "../lib/types";
import { AgentTimeline } from "./AgentTimeline";
import { ApprovalAuditPanel } from "./ApprovalAuditPanel";
import { DemoControls } from "./DemoControls";
import { EvermindLearningPanel } from "./EvermindLearningPanel";
import { IMessagePanel } from "./IMessagePanel";
import { RiskPlanHero } from "./RiskPlanHero";
import { SignalIntelligenceStrip } from "./SignalIntelligenceStrip";
import { StatusPill } from "./StatusPill";

const initialVendorStatus: VendorStatus = {
  butterbase: "missing",
  butterbaseRag: "missing",
  evermind: "missing",
  nebius: "missing",
  photon: "missing"
};

const tabs = [
  { id: "live", label: "Live Demo" },
  { id: "risk", label: "Risk Plan" },
  { id: "signals", label: "Signals" },
  { id: "approval", label: "Approval + Audit" },
  { id: "memory", label: "Evermind" }
] as const;

type TabId = (typeof tabs)[number]["id"];

function event(label: string, status: AgentTimelineEvent["status"], detail?: string): AgentTimelineEvent {
  return { id: crypto.randomUUID(), label, status, detail, createdAt: new Date().toISOString() };
}

export function LiveCommandView() {
  const [state, setState] = useState<LiveCommandState>({
    vendorStatus: initialVendorStatus,
    signals: [],
    policies: [],
    memories: [],
    timeline: [
      event("Received iMessage", "pending"),
      event("Matched event", "pending"),
      event("Pulled weather", "pending"),
      event("Checked news/transit", "pending"),
      event("Retrieved Butterbase policies", "pending"),
      event("Retrieved Evermind memories", "pending"),
      event("Nebius generated plan", "pending"),
      event("Awaiting approval", "pending")
    ],
    auditEvents: []
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnedMemory, setLearnedMemory] = useState<MemoryRecord | undefined>();
  const [approved, setApproved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("live");

  const blockingSetup = useMemo(() => {
    const status = state.vendorStatus;
    return status.butterbase !== "ok" || status.butterbaseRag !== "ok" || status.evermind !== "ok" || status.nebius !== "ok";
  }, [state.vendorStatus]);

  async function refreshVendors() {
    setError(null);
    const response = await fetch("/api/health/vendors");
    const vendorStatus = (await response.json()) as VendorStatus;
    setState((current) => ({ ...current, vendorStatus }));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/vendors")
      .then((response) => response.json())
      .then((vendorStatus: VendorStatus) => {
        if (!cancelled) setState((current) => ({ ...current, vendorStatus }));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Vendor status failed.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runDemoAnalysis() {
    setBusy(true);
    setError(null);
    setApproved(false);
    setLearnedMemory(undefined);
    setActiveTab("live");
    setState((current) => ({
      ...current,
      timeline: [
        event("Received iMessage", "complete", "Analyze Brazil vs Morocco for my sports bar"),
        event("Matched event", "running", "Looking up seeded Butterbase match"),
        event("Pulled weather", "pending"),
        event("Checked news/transit", "pending"),
        event("Retrieved Butterbase policies", "pending"),
        event("Retrieved Evermind memories", "pending"),
        event("Nebius generated plan", "pending"),
        event("Awaiting approval", "pending")
      ]
    }));

    try {
      const response = await fetch("/api/analyze-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: "00000000-0000-4000-8000-000000000613", operatorType: "sports_bar", channel: "dashboard" })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Analysis failed.");
      const audit: AuditEvent = {
        id: crypto.randomUUID(),
        actor: "crowdops-agent",
        channel: "dashboard",
        eventType: "ops_plan_generated",
        payload: { planId: body.plan.id },
        createdAt: new Date().toISOString()
      };
      setState((current) => ({
        ...current,
        selectedMatch: body.match,
        signals: body.signals,
        policies: body.policies,
        memories: body.memories,
        plan: body.plan,
        auditEvents: [audit, ...current.auditEvents],
        timeline: [
          event("Received iMessage", "complete", "Analyze Brazil vs Morocco for my sports bar"),
          event("Matched event", "complete", `${body.match.homeTeam} vs ${body.match.awayTeam}`),
          event("Pulled weather", "complete"),
          event("Checked news/transit", "complete"),
          event("Retrieved Butterbase policies", "complete", `${body.policies.length} policy hits`),
          event("Retrieved Evermind memories", "complete", `${body.memories.length} memories`),
          event("Nebius generated plan", "complete", `${body.plan.riskLevel.toUpperCase()} ${body.plan.riskScore}/100`),
          event("Awaiting approval", "running", "Reply approve all or use dashboard controls")
        ]
      }));
      setActiveTab("risk");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setState((current) => ({ ...current, timeline: [...current.timeline, event("Setup or analysis error", "error")] }));
    } finally {
      setBusy(false);
    }
  }

  async function approveAll() {
    if (!state.plan) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/approve-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: state.plan.id,
          approveAll: true,
          approvedActionIds: state.plan.recommendedActions.map((action) => action.id),
          channel: "dashboard",
          actor: "demo-operator",
          operatorNote: "Approved from dashboard"
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Approval failed.");
      setLearnedMemory(body.memory);
      setApproved(true);
      setActiveTab("approval");
      setState((current) => ({
        ...current,
        auditEvents: [
          {
            id: crypto.randomUUID(),
            actor: "demo-operator",
            channel: "dashboard",
            eventType: "actions_approved",
            payload: body.approvedActionIds,
            createdAt: new Date().toISOString()
          },
          ...current.auditEvents
        ],
        timeline: current.timeline.map((item) => item.label === "Awaiting approval" ? { ...item, status: "complete", detail: "Actions approved and learned memory saved" } : item)
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  async function moveMatch() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/move-match", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Demo mode failed.");
      setState((current) => ({
        ...current,
        selectedMatch: body.match,
        auditEvents: [
          {
            id: crypto.randomUUID(),
            actor: "demo-operator",
            channel: "dashboard",
            eventType: "demo_match_time_updated",
            payload: body.match,
            createdAt: new Date().toISOString()
          },
          ...current.auditEvents
        ]
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo mode failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="command-grid relative min-h-screen overflow-x-hidden bg-[#f7f7fb] p-3 text-slate-950 md:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.14),transparent_26%),radial-gradient(circle_at_78%_0%,rgba(124,58,237,0.13),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.88))]" />
      <div className="relative mx-auto max-w-[1500px] space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                  MVP Speed-Run
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  Brazil vs Morocco · Sports Bar · 90 min window
                </span>
              </div>
              <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:gap-4">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">CrowdOps AI</h1>
                <p className="text-pretty text-sm text-slate-600 md:text-base">
                  iMessage-native operations copilot for World Cup match days.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Butterbase" status={state.vendorStatus.butterbase} />
                <StatusPill label="Butterbase RAG" status={state.vendorStatus.butterbaseRag} />
                <StatusPill label="Evermind" status={state.vendorStatus.evermind} />
                <StatusPill label="Nebius" status={state.vendorStatus.nebius} />
                <StatusPill label="Photon" status={state.vendorStatus.photon} />
              </div>
              <DemoControls
                busy={busy}
                canRun={!blockingSetup}
                canMoveMatch={state.vendorStatus.butterbase === "ok"}
                onRun={runDemoAnalysis}
                onMoveMatch={moveMatch}
                onRefresh={refreshVendors}
              />
            </div>
          </div>
        </header>

        {(blockingSetup || state.vendorStatus.photon !== "ok" || error) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm">
            {error ??
              "Setup required: Butterbase, Evermind, and Nebius must be connected before plan generation. Photon is required for the final iMessage demo."}
          </div>
        ) : null}

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-xl shadow-slate-900/5 backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "live" ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <IMessagePanel plan={state.plan} approved={approved} photonStatus={state.vendorStatus.photon} />
            </div>
            <div className="xl:col-span-5">
              <RiskPlanHero plan={state.plan} running={busy && !state.plan} />
            </div>
            <div className="xl:col-span-3">
              <AgentTimeline events={state.timeline} />
            </div>
          </section>
        ) : null}

        {activeTab === "risk" ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <RiskPlanHero plan={state.plan} running={busy && !state.plan} />
            </div>
            <div className="xl:col-span-4">
              <AgentTimeline events={state.timeline} />
            </div>
          </section>
        ) : null}

        {activeTab === "signals" ? (
          <SignalIntelligenceStrip
            match={state.selectedMatch}
            signals={state.signals}
            policies={state.policies}
            memories={state.memories}
          />
        ) : null}

        {activeTab === "approval" ? (
          <ApprovalAuditPanel
            disabled={busy || !state.plan}
            approved={approved}
            auditEvents={state.auditEvents}
            learnedMemory={learnedMemory}
            onApprove={approveAll}
            onReject={() => setError("Reject is wired for demo visibility; use iMessage reject flow for full approval routing.")}
            onDraft={() => setError("Draft is visible for the approval flow but not persisted in this MVP.")}
          />
        ) : null}

        {activeTab === "memory" ? (
          <EvermindLearningPanel memories={state.memories} learnedMemory={learnedMemory} />
        ) : null}
      </div>
    </main>
  );
}
