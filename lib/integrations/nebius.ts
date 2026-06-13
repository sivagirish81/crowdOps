import OpenAI from "openai";
import { z } from "zod";
import { requireNebiusConfig } from "../config";
import { VendorIntegrationError } from "../errors";
import type { MatchEvent, MemoryRecord, OperatorType, OpsPlan, RetrievedPolicy, RiskLevel, Signal } from "../types";

const sourceBasisSchema = z.enum([
  "world_cup_schedule",
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
            rationale: actionObj.rationale ?? actionObj.reason ?? actionObj.reasoning ?? actionObj.description ?? actionObj.justification ?? "Recommended by Nebius from the supplied live signals, Butterbase policies, and Evermind memories.",
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
- Every recommended action must cite sourceBasis using one or more of:
  world_cup_schedule, weather, transit, news, butterbase_rag, evermind_memory.
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
        rationale: "Butterbase policy recommends queue separation when high demand overlaps with weather, transit, or crowd risk.",
        urgency: "next_30_min",
        owner: "front_of_house_lead",
        requiresApproval: false,
        sourceBasis: ["world_cup_schedule", "butterbase_rag"],
        status: "pending"
      }
    ];
    const parsed = generatedPlanSchema.parse({
      ...normalized,
      summary: normalized.summary ?? `${input.match.homeTeam} vs ${input.match.awayTeam} requires ${input.deterministicRiskLevel} operational readiness.`,
      reasoning: normalized.reasoning.length > 0 ? normalized.reasoning : input.deterministicReasons,
      recommendedActions: normalized.recommendedActions.length > 0 ? normalized.recommendedActions : fallbackActions
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
}): Promise<string> {
  const config = requireNebiusConfig();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const lower = input.question.toLowerCase();
  const asksForLiveScore = /(score|winning|winner|who'?s winning|whose winning|what'?s happening in the match|live)/.test(lower);

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
There is no live score or play-by-play feed connected unless it appears in the input.
If the user asks who is winning or what is happening in the match, clearly say live match score is not connected, then pivot to operational guidance.
Offer ideas/promotions are allowed, but public-facing offers require manager approval.
Use the existing plan context.`
        },
        {
          role: "user",
          content: JSON.stringify({
            question: input.question,
            asksForLiveScore,
            match: input.match,
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
