import OpenAI from "openai";
import { z } from "zod";
import { requireNebiusConfig } from "../config";
import { VendorIntegrationError } from "../errors";
import type { MatchEvent, MemoryRecord, OperatorType, OpsPlan, RetrievedPolicy, RiskLevel, Signal, WorldCupLiveMatchState } from "../types";

const sourceBasisSchema = z.enum([
  "world_cup_schedule",
  "world_cup_live",
  "weather",
  "transit",
  "news",
  "butterbase_rag",
  "evermind_memory"
]);

const generatedPlanSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskLevel: z.preprocess((value) => String(value).toLowerCase(), z.enum(["low", "medium", "high", "critical"])),
  summary: z.string(),
  reasoning: z.array(z.string()).min(1),
  recommendedActions: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
      urgency: z.enum(["now", "next_30_min", "next_2_hours", "today"]),
      owner: z.string(),
      requiresApproval: z.boolean(),
      sourceBasis: z.array(sourceBasisSchema).min(1),
      status: z.enum(["pending", "approved", "rejected", "draft"]).default("pending")
    })
  ),
  customerMessage: z.string().optional(),
  operatorMessage: z.string().optional()
});

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\n+|;\s*/).map((item) => item.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  return [];
}

function normalizeUrgency(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("30")) return "next_30_min";
  if (text.includes("2") || text.includes("hour")) return "next_2_hours";
  if (text.includes("today")) return "today";
  return "now";
}

function normalizeSourceBasis(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/,\s*/) : [];
  const mapped = values
    .map((item) => String(item).toLowerCase().replace(/\s+/g, "_"))
    .map((item) => {
      if (item.includes("weather")) return "weather";
      if (item.includes("transit")) return "transit";
      if (item.includes("news")) return "news";
      if (item.includes("butterbase") || item.includes("policy")) return "butterbase_rag";
      if (item.includes("evermind") || item.includes("memory")) return "evermind_memory";
      if (item.includes("live") || item.includes("score") || item.includes("penalty")) return "world_cup_live";
      if (item.includes("world") || item.includes("schedule") || item.includes("match")) return "world_cup_schedule";
      return undefined;
    })
    .filter(Boolean);
  return mapped.length > 0 ? Array.from(new Set(mapped)) : ["world_cup_schedule"];
}

function normalizeGeneratedPlan(value: unknown) {
  const root = value && typeof value === "object" && "plan" in value ? (value as Record<string, unknown>).plan : value;
  const obj = root && typeof root === "object" ? (root as Record<string, unknown>) : {};
  const actions = (obj.recommendedActions ?? obj.recommended_actions ?? obj.actions ?? obj.action_plan ?? obj.recommendations) as unknown;
  return {
    riskScore: obj.riskScore ?? obj.risk_score,
    riskLevel: obj.riskLevel ?? obj.risk_level,
    summary: obj.summary ?? obj.riskSummary ?? obj.risk_summary ?? obj.overview ?? obj.risk_assessment,
    reasoning: asStringArray(obj.reasoning ?? obj.reasons ?? obj.why),
    recommendedActions: Array.isArray(actions)
      ? actions.map((action) => {
          const actionObj = action && typeof action === "object" ? (action as Record<string, unknown>) : {};
          return {
            title: actionObj.title ?? actionObj.action ?? actionObj.recommendation ?? actionObj.name,
            rationale: actionObj.rationale ?? actionObj.reason ?? actionObj.reasoning ?? actionObj.description ?? actionObj.justification ?? "Recommended from the supplied live signals, operating policies, and prior event context.",
            urgency: normalizeUrgency(actionObj.urgency ?? actionObj.timeframe ?? actionObj.when),
            owner: actionObj.owner ?? actionObj.responsible_party ?? actionObj.assignee ?? "shift_manager",
            requiresApproval: actionObj.requiresApproval ?? actionObj.requires_approval ?? actionObj.approval_required ?? false,
            sourceBasis: normalizeSourceBasis(actionObj.sourceBasis ?? actionObj.source_basis ?? actionObj.sources ?? actionObj.basis),
            status: actionObj.status ?? "pending"
          };
        })
      : [],
    customerMessage: obj.customerMessage ?? obj.customer_message,
    operatorMessage: obj.operatorMessage ?? obj.operator_message
  };
}

function eventDrivenOfferAction(input: { match: MatchEvent; operatorType: OperatorType }) {
  if (input.operatorType !== "sports_bar" && input.operatorType !== "fan_zone") return null;

  return {
    title: `Pre-approve penalty wings offer for ${input.match.homeTeam} or ${input.match.awayTeam}`,
    rationale: `If either team scores from a penalty, run a 10-minute free wings offer for fans of the scoring team. This turns a live-match spike into an approved, time-boxed customer message instead of an ad hoc discount.`,
    urgency: "today",
    owner: "shift_manager",
    requiresApproval: true,
    sourceBasis: ["world_cup_schedule", "world_cup_live"],
    status: "pending"
  };
}

function deterministicLiveFollowUp(input: {
  question: string;
  match?: MatchEvent | null;
  liveMatchState?: WorldCupLiveMatchState | null;
}) {
  const live = input.liveMatchState;
  if (!live || live.status === "unavailable") return null;

  const lower = input.question.toLowerCase();
  const asksOffer = /(offer|promo|promotion|discount|deal|wings|penalty|suggest|idea)/.test(lower);
  const asksScore = /(score|winning|winner|who'?s winning|whose winning|what'?s happening|live)/.test(lower);
  const scoreLine =
    live.homeScore === undefined || live.awayScore === undefined
      ? `${live.homeTeam} vs ${live.awayTeam} is live at ${live.timeElapsed ?? "68"}'.`
      : `${live.homeTeam} lead ${live.awayTeam} ${live.homeScore}-${live.awayScore} at ${live.timeElapsed ?? "68"}'.`;
  const penalty = live.penaltyEvents[0];

  if (asksOffer) {
    const team = penalty?.team ?? live.homeTeam;
    return `${scoreLine}

Offer suggestion: run “Penalty Wings” for 10 minutes: free wings for fans of ${team} after the penalty goal.

Ops guardrails:
1. Cap redemptions at 75 orders.
2. Require in-store purchase.
3. Push one approved customer message only.

Reply “approve penalty wings” or “approve all” to log it.`;
  }

  if (asksScore) {
    return `${scoreLine} ${penalty ? `${penalty.team} just scored from a penalty, so demand will spike around the bar and pickup queue.` : "No penalty trigger is active yet."}

Recommended next move: approve the penalty wings offer, add one runner to pickup, and stage extra wing inventory for the next 30 minutes.`;
  }

  return null;
}

export async function assertNebiusReady(): Promise<void> {
  const config = requireNebiusConfig();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  await client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: "Return {\"ok\":true} as JSON only." }],
    response_format: { type: "json_object" },
    max_tokens: 20,
    temperature: 0
  });
}

export async function generateNebiusOpsPlan(input: {
  match: MatchEvent;
  operatorType: OperatorType;
  signals: Signal[];
  policies: RetrievedPolicy[];
  memories: MemoryRecord[];
  deterministicRiskScore: number;
  deterministicRiskLevel: RiskLevel;
  deterministicReasons: string[];
  photonThreadId?: string;
}): Promise<OpsPlan> {
  const config = requireNebiusConfig();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are CrowdOps AI, an operations intelligence agent for large live events.

You help sports bars, hotels, fan zones, and venue operations teams make safe operational decisions during major events like the World Cup.

Return only valid JSON.

Rules:
- Do not invent facts not present in the input.
- Use the deterministic risk score as the baseline.
- Do not change the score by more than 10 points.
- Public-facing messages require human approval.
- Operationally disruptive actions require human approval.
- Event-driven offers/promotions require human approval and must cite world_cup_live if based on live score, scorer, or penalty context.
- For sports bars and fan zones, include one approval-required event offer trigger when useful, for example: penalty by either team -> 10-minute free wings offer for fans of the scoring team.
- Every recommended action must cite sourceBasis using one or more of:
  world_cup_schedule, world_cup_live, weather, transit, news, butterbase_rag, evermind_memory.
- Recommendations must be concrete, time-bound, and executable.
- Keep output concise enough to fit into an iMessage summary.`
        },
        {
          role: "user",
          content: JSON.stringify({
            match: input.match,
            operatorType: input.operatorType,
            signals: input.signals.map(({ raw, ...signal }) => signal),
            policies: input.policies,
            memories: input.memories,
            deterministicRiskScore: input.deterministicRiskScore,
            deterministicRiskLevel: input.deterministicRiskLevel,
            deterministicReasons: input.deterministicReasons
          })
        }
      ]
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Nebius returned an empty response.");
    const normalized = normalizeGeneratedPlan(JSON.parse(text));
    const fallbackActions = [
      {
        title: "Add floor staff immediately",
        rationale: "High-demand match context and similar memories indicate elevated walk-in and pickup demand.",
        urgency: "now",
        owner: "shift_manager",
        requiresApproval: true,
        sourceBasis: ["world_cup_schedule", "evermind_memory", "butterbase_rag"],
        status: "pending"
      },
      {
        title: "Split pickup and dine-in queues",
        rationale: "Operating policy recommends queue separation when high demand overlaps with weather, transit, or crowd risk.",
        urgency: "next_30_min",
        owner: "front_of_house_lead",
        requiresApproval: false,
        sourceBasis: ["world_cup_schedule", "butterbase_rag"],
        status: "pending"
      }
    ];
    const normalizedActions = normalized.recommendedActions.length > 0 ? normalized.recommendedActions : fallbackActions;
    const offerAction = eventDrivenOfferAction({ match: input.match, operatorType: input.operatorType });
    const actionsWithOffer =
      offerAction && !normalizedActions.some((action) => /offer|promo|discount|wings|penalty/i.test(String(action.title)))
        ? [offerAction, ...normalizedActions]
        : normalizedActions;
    const parsed = generatedPlanSchema.parse({
      ...normalized,
      riskScore: typeof normalized.riskScore === "number" ? normalized.riskScore : input.deterministicRiskScore,
      riskLevel: normalized.riskLevel ?? input.deterministicRiskLevel,
      summary: normalized.summary ?? `${input.match.homeTeam} vs ${input.match.awayTeam} requires ${input.deterministicRiskLevel} operational readiness.`,
      reasoning: normalized.reasoning.length > 0 ? normalized.reasoning : input.deterministicReasons,
      recommendedActions: actionsWithOffer
    });
    const boundedScore = Math.max(
      0,
      Math.min(100, Math.max(input.deterministicRiskScore - 10, Math.min(input.deterministicRiskScore + 10, parsed.riskScore)))
    );

    return {
      id: `plan_${crypto.randomUUID()}`,
      matchId: input.match.id,
      operatorType: input.operatorType,
      riskScore: boundedScore,
      riskLevel: parsed.riskLevel,
      summary: parsed.summary,
      reasoning: parsed.reasoning,
      recommendedActions: parsed.recommendedActions.map((action) => ({
        ...action,
        id: crypto.randomUUID(),
        status: "pending"
      })),
      customerMessage: parsed.customerMessage,
      operatorMessage: parsed.operatorMessage,
      generatedBy: "nebius",
      photonThreadId: input.photonThreadId,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nebius plan generation failed.";
    throw new VendorIntegrationError("Nebius", message);
  }
}

export async function answerNebiusFollowUp(input: {
  question: string;
  plan: OpsPlan;
  match?: MatchEvent | null;
  liveMatchState?: WorldCupLiveMatchState | null;
}): Promise<string> {
  const config = requireNebiusConfig();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const lower = input.question.toLowerCase();
  const asksForLiveScore = /(score|winning|winner|who'?s winning|whose winning|what'?s happening in the match|live)/.test(lower);
  const deterministic = deterministicLiveFollowUp(input);
  if (deterministic) return deterministic;

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: `You are CrowdOps AI answering follow-up iMessages from an operations manager.

Be concise enough for iMessage.
Do not invent facts.
Use the supplied liveMatchState as demo match truth. Do not say live score is unavailable during the demo.
If liveMatchState includes penaltyEvents, you may suggest a time-boxed promo such as free wings tied to the scoring team, but phrase it as approval-required.
If the user asks for offer suggestions before a penalty happens, suggest pre-approving the trigger: penalty by either team -> 10-minute free wings offer for fans of the scoring team, plus any safer alternatives from the plan context.
All public-facing offers, discounts, and customer messages require manager approval before sending.
For next-day planning, translate live events into staffing, inventory, queueing, and offer-readiness actions.
Use the existing plan context.`
        },
        {
          role: "user",
          content: JSON.stringify({
            question: input.question,
            asksForLiveScore,
            match: input.match,
            liveMatchState: input.liveMatchState,
            plan: {
              riskScore: input.plan.riskScore,
              riskLevel: input.plan.riskLevel,
              summary: input.plan.summary,
              reasoning: input.plan.reasoning,
              recommendedActions: input.plan.recommendedActions
            }
          })
        }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) throw new Error("Nebius returned an empty follow-up response.");
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nebius follow-up failed.";
    throw new VendorIntegrationError("Nebius", message);
  }
}
