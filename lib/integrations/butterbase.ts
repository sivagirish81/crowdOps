import { requireButterbaseConfig } from "../config";
import { VendorIntegrationError } from "../errors";
import type {
  AuditEvent,
  City,
  MatchEvent,
  OpsPlan,
  PhotonMessageRecord,
  RecommendedAction,
  RetrievedPolicy,
  Signal
} from "../types";

export interface ButterbaseAdapter {
  assertReady(): Promise<void>;
  upsertCity(city: City): Promise<void>;
  upsertMatch(match: MatchEvent): Promise<void>;
  listMatches(): Promise<MatchEvent[]>;
  getMatchById(matchId: string): Promise<MatchEvent | null>;
  findMatchByTeams(query: string): Promise<MatchEvent | null>;
  saveSignal(signal: Signal): Promise<void>;
  saveOpsPlan(plan: OpsPlan): Promise<void>;
  getOpsPlanById(planId: string): Promise<OpsPlan | null>;
  getLatestPlanByThread(threadId: string): Promise<OpsPlan | null>;
  getLatestPendingPlanByThread(threadId: string): Promise<OpsPlan | null>;
  saveAction(action: RecommendedAction & { planId: string }): Promise<void>;
  updateActionStatus(actionId: string, status: "approved" | "rejected" | "draft"): Promise<void>;
  saveAuditLog(event: {
    actor: string;
    channel: "dashboard" | "photon_imessage" | "system";
    eventType: string;
    payload: unknown;
  }): Promise<void>;
  savePhotonMessage(message: PhotonMessageRecord): Promise<void>;
  getLatestPhotonMessages(limit?: number): Promise<PhotonMessageRecord[]>;
  createRagCollectionIfMissing(): Promise<void>;
  ingestPolicyDocument(input: {
    filename: string;
    text: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
  queryPolicies(query: string, topK?: number): Promise<RetrievedPolicy[]>;
}

type Row = Record<string, unknown>;

const tables = {
  cities: "cities",
  matches: "matches",
  signals: "signals",
  opsPlans: "ops_plans",
  actions: "actions",
  auditLogs: "audit_logs",
  photonMessages: "photon_messages"
} as const;

function nowIso() {
  return new Date().toISOString();
}

function unwrapRows(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload as Row[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Row[];
    if (Array.isArray(obj.rows)) return obj.rows as Row[];
    if (Array.isArray(obj.items)) return obj.items as Row[];
    if (Array.isArray(obj.chunks)) return obj.chunks as Row[];
    if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).rows)) {
      return (obj.data as Record<string, unknown>).rows as Row[];
    }
  }
  return [];
}

function cityToRow(city: City): Row {
  return { ...city, created_at: nowIso() };
}

function matchToRow(match: MatchEvent): Row {
  return {
    id: match.id,
    home_team: match.homeTeam,
    away_team: match.awayTeam,
    city_id: match.cityId,
    city_name: match.cityName,
    venue: match.venue,
    starts_at: match.startsAt,
    expected_demand: match.expectedDemand,
    status: match.status,
    created_at: nowIso()
  };
}

function rowToMatch(row: Row): MatchEvent {
  return {
    id: String(row.id),
    homeTeam: String(row.home_team),
    awayTeam: String(row.away_team),
    cityId: String(row.city_id),
    cityName: String(row.city_name),
    venue: String(row.venue),
    startsAt: String(row.starts_at),
    expectedDemand: row.expected_demand as MatchEvent["expectedDemand"],
    status: row.status as MatchEvent["status"]
  };
}

function rowToPlan(row: Row): OpsPlan {
  const reasoningPayload = typeof row.reasoning === "string" ? JSON.parse(String(row.reasoning ?? "[]")) : row.reasoning;
  const actionsPayload =
    typeof row.recommended_actions === "string" ? JSON.parse(String(row.recommended_actions ?? "[]")) : row.recommended_actions;
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    operatorType: row.operator_type as OpsPlan["operatorType"],
    riskScore: Number(row.risk_score),
    riskLevel: row.risk_level as OpsPlan["riskLevel"],
    summary: String(row.summary),
    reasoning: Array.isArray(reasoningPayload)
      ? (reasoningPayload as string[])
      : Array.isArray((reasoningPayload as Record<string, unknown> | undefined)?.items)
      ? ((reasoningPayload as { items: string[] }).items)
      : [],
    recommendedActions: Array.isArray(actionsPayload)
      ? (actionsPayload as RecommendedAction[])
      : Array.isArray((actionsPayload as Record<string, unknown> | undefined)?.items)
      ? ((actionsPayload as { items: RecommendedAction[] }).items)
      : [],
    customerMessage: row.customer_message ? String(row.customer_message) : undefined,
    operatorMessage: row.operator_message ? String(row.operator_message) : undefined,
    generatedBy: "nebius",
    photonThreadId: row.photon_thread_id ? String(row.photon_thread_id) : undefined,
    createdAt: String(row.created_at)
  };
}

function rowToPhotonMessage(row: Row): PhotonMessageRecord {
  return {
    id: String(row.id),
    externalMessageId: row.external_message_id ? String(row.external_message_id) : undefined,
    threadId: String(row.thread_id),
    sender: String(row.sender),
    direction: row.direction as PhotonMessageRecord["direction"],
    body: String(row.body),
    parsedIntent: row.parsed_intent ? String(row.parsed_intent) : undefined,
    payload: row.payload,
    createdAt: String(row.created_at)
  };
}

function isOfficialWorldCupScheduleMatch(match: MatchEvent) {
  const suffix = match.id.match(/000000000(\d{3})$/)?.[1];
  if (!suffix) return false;
  const gameNumber = Number(suffix);
  return gameNumber >= 1 && gameNumber <= 104;
}

class HttpButterbaseAdapter implements ButterbaseAdapter {
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly serviceKey: string;
  private readonly ragCollection: string;

  constructor() {
    const config = requireButterbaseConfig();
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.appId = config.appId;
    this.serviceKey = config.serviceKey.replace(/^Bearer\s+/i, "");
    this.ragCollection = config.ragCollection;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.serviceKey}`,
        "Content-Type": "application/json",
        "X-Butterbase-App-Id": this.appId,
        ...init?.headers
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new VendorIntegrationError("Butterbase", `${response.status} ${response.statusText}: ${text}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private tablePath(table: string, suffix = "") {
    return `/${table}${suffix}`;
  }

  private async upsert(table: string, row: Row) {
    try {
      await this.request(this.tablePath(table), {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(row)
      });
    } catch (error) {
      if (!(error instanceof VendorIntegrationError) || !error.message.includes("VALIDATION_UNIQUE_CONSTRAINT_VIOLATION")) {
        throw error;
      }
      try {
        await this.request(this.tablePath(table, `/${encodeURIComponent(String(row.id))}`), {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(row)
        });
      } catch (patchError) {
        if (
          patchError instanceof VendorIntegrationError &&
          patchError.message.includes("VALIDATION_INVALID_TYPE") &&
          patchError.message.includes("Invalid UUID format")
        ) {
          return;
        }
        throw patchError;
      }
    }
  }

  private async list(table: string, params?: URLSearchParams) {
    const suffix = params ? `?${params.toString()}` : "";
    return unwrapRows(await this.request(this.tablePath(table, suffix)));
  }

  async assertReady() {
    await this.list(tables.matches, new URLSearchParams({ limit: "1" }));
  }

  async upsertCity(city: City) {
    await this.upsert(tables.cities, cityToRow(city));
  }

  async upsertMatch(match: MatchEvent) {
    await this.upsert(tables.matches, matchToRow(match));
  }

  async listMatches() {
    const params = new URLSearchParams({ order: "starts_at.asc" });
    return (await this.list(tables.matches, params)).map(rowToMatch);
  }

  async getMatchById(matchId: string) {
    const rows = await this.list(tables.matches, new URLSearchParams({ id: `eq.${matchId}`, limit: "1" }));
    return rows[0] ? rowToMatch(rows[0]) : null;
  }

  async findMatchByTeams(query: string) {
    const normalized = query.toLowerCase();
    const matches = await this.listMatches();
    const candidates = matches.filter(
      (match) =>
        `${match.homeTeam} ${match.awayTeam}`.toLowerCase().includes(normalized) ||
        normalized.includes(match.homeTeam.toLowerCase()) ||
        normalized.includes(match.awayTeam.toLowerCase())
    );
    const ranked = (candidates.length > 0 ? candidates : matches).sort((a, b) => {
      const now = Date.now();
      const aOfficial = isOfficialWorldCupScheduleMatch(a);
      const bOfficial = isOfficialWorldCupScheduleMatch(b);
      if (aOfficial !== bOfficial) return aOfficial ? -1 : 1;
      const aDistance = Math.abs(new Date(a.startsAt).getTime() - now);
      const bDistance = Math.abs(new Date(b.startsAt).getTime() - now);
      if (aDistance !== bDistance) return aDistance - bDistance;
        const demandRank = { very_high: 3, high: 2, medium: 1, low: 0 };
        return demandRank[b.expectedDemand] - demandRank[a.expectedDemand];
    });
    return ranked[0] ?? null;
  }

  async saveSignal(signal: Signal) {
    await this.upsert(tables.signals, {
      id: signal.id,
      match_id: signal.matchId,
      source: signal.source,
      type: signal.type,
      severity: signal.severity,
      summary: signal.summary,
      raw_payload: signal.raw ?? null,
      created_at: signal.createdAt
    });
  }

  async saveOpsPlan(plan: OpsPlan) {
    await this.upsert(tables.opsPlans, {
      id: plan.id,
      match_id: plan.matchId,
      operator_type: plan.operatorType,
      risk_score: plan.riskScore,
      risk_level: plan.riskLevel,
      summary: plan.summary,
      reasoning: { items: plan.reasoning },
      recommended_actions: { items: plan.recommendedActions },
      customer_message: plan.customerMessage ?? null,
      operator_message: plan.operatorMessage ?? null,
      generated_by: plan.generatedBy,
      photon_thread_id: plan.photonThreadId ?? null,
      created_at: plan.createdAt
    });
  }

  async getOpsPlanById(planId: string) {
    const rows = await this.list(tables.opsPlans, new URLSearchParams({ id: `eq.${planId}`, limit: "1" }));
    return rows[0] ? rowToPlan(rows[0]) : null;
  }

  async getLatestPlanByThread(threadId: string) {
    const params = new URLSearchParams({
      photon_thread_id: `eq.${threadId}`,
      order: "created_at.desc",
      limit: "1"
    });
    const rows = await this.list(tables.opsPlans, params);
    return rows[0] ? rowToPlan(rows[0]) : null;
  }

  async getLatestPendingPlanByThread(threadId: string) {
    const params = new URLSearchParams({
      photon_thread_id: `eq.${threadId}`,
      order: "created_at.desc",
      limit: "10"
    });
    const rows = await this.list(tables.opsPlans, params);
    return rows.map(rowToPlan).find((plan) => plan.recommendedActions.some((action) => action.status === "pending")) ?? null;
  }

  async saveAction(action: RecommendedAction & { planId: string }) {
    await this.upsert(tables.actions, {
      id: action.id,
      plan_id: action.planId,
      title: action.title,
      status: action.status,
      requires_approval: action.requiresApproval,
      owner: action.owner,
      payload: action,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }

  async updateActionStatus(actionId: string, status: "approved" | "rejected" | "draft") {
    await this.request(this.tablePath(tables.actions, `/${encodeURIComponent(actionId)}`), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, updated_at: nowIso() })
    });
  }

  async saveAuditLog(event: {
    actor: string;
    channel: "dashboard" | "photon_imessage" | "system";
    eventType: string;
    payload: unknown;
  }) {
    await this.upsert(tables.auditLogs, {
      id: `audit_${crypto.randomUUID()}`,
      actor: event.actor,
      channel: event.channel,
      event_type: event.eventType,
      payload: event.payload,
      created_at: nowIso()
    });
  }

  async savePhotonMessage(message: PhotonMessageRecord) {
    await this.upsert(tables.photonMessages, {
      id: message.id,
      external_message_id: message.externalMessageId ?? null,
      thread_id: message.threadId,
      sender: message.sender,
      direction: message.direction,
      body: message.body,
      parsed_intent: message.parsedIntent ?? null,
      payload: message.payload ?? null,
      created_at: message.createdAt
    });
  }

  async getLatestPhotonMessages(limit = 10) {
    const rows = await this.list(
      tables.photonMessages,
      new URLSearchParams({ order: "created_at.desc", limit: String(limit) })
    );
    return rows.map(rowToPhotonMessage);
  }

  async createRagCollectionIfMissing() {
    try {
      await this.request(`/rag/collections/${encodeURIComponent(this.ragCollection)}`);
      return;
    } catch {
      // Continue to creation when the collection is not found.
    }
    await this.request(`/rag/collections`, {
      method: "POST",
      body: JSON.stringify({ name: this.ragCollection, description: "CrowdOps operating policies", access_mode: "private" })
    });
  }

  async ingestPolicyDocument(input: {
    filename: string;
    text: string;
    metadata: Record<string, unknown>;
  }) {
    await this.request(`/rag/collections/${encodeURIComponent(this.ragCollection)}/ingest`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async queryPolicies(query: string, topK = 5) {
    const payload = await this.request(
      `/rag/collections/${encodeURIComponent(this.ragCollection)}/query`,
      {
        method: "POST",
        body: JSON.stringify({ query, top_k: topK })
      }
    );
    const rows = unwrapRows(payload);
    return rows.map((row, index) => {
      const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : undefined;
      return {
        id: String(row.id ?? row.document_id ?? `policy_${index}`),
        title: String(row.title ?? row.filename ?? metadata?.filename ?? "Butterbase policy"),
        excerpt: String(row.excerpt ?? row.text ?? row.content ?? row.chunk ?? ""),
        score: row.score ? Number(row.score) : undefined,
        metadata
      };
    });
  }
}

let adapter: ButterbaseAdapter | undefined;

export function getButterbaseAdapter(): ButterbaseAdapter {
  adapter ??= new HttpButterbaseAdapter();
  return adapter;
}

export async function moveBrazilMoroccoToDemoWindow() {
  const butterbase = getButterbaseAdapter();
  const match = await butterbase.getMatchById("00000000-0000-4000-8000-000000000613");
  if (!match) {
    throw new VendorIntegrationError("Butterbase", "Brazil vs Morocco match is not seeded.");
  }
  const startsAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  await butterbase.upsertMatch({ ...match, startsAt });
  await butterbase.saveAuditLog({
    actor: "demo-operator",
    channel: "dashboard",
    eventType: "demo_match_time_updated",
    payload: { matchId: match.id, startsAt }
  });
  return { ...match, startsAt };
}

export async function listAuditEvents(limit = 10): Promise<AuditEvent[]> {
  const instance = getButterbaseAdapter() as HttpButterbaseAdapter;
  const rows = await instance["list"](
    tables.auditLogs,
    new URLSearchParams({ order: "created_at.desc", limit: String(limit) })
  );
  return rows.map((row) => ({
    id: String(row.id),
    actor: String(row.actor),
    channel: row.channel as AuditEvent["channel"],
    eventType: String(row.event_type),
    payload: row.payload,
    createdAt: String(row.created_at)
  }));
}
