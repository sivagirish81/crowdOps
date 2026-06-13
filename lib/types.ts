export type OperatorType =
  | "sports_bar"
  | "fan_zone"
  | "hotel"
  | "venue_ops";

export type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SignalSource =
  | "world_cup_schedule"
  | "weather"
  | "transit"
  | "news"
  | "butterbase_rag"
  | "evermind_memory"
  | "nebius_inference"
  | "photon_imessage";

export interface City {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface MatchEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  cityId: string;
  cityName: string;
  venue: string;
  startsAt: string;
  expectedDemand: "low" | "medium" | "high" | "very_high";
  status: "scheduled" | "live" | "complete";
}

export interface Signal {
  id: string;
  matchId: string;
  source: SignalSource;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  raw?: unknown;
  createdAt: string;
}

export interface RetrievedPolicy {
  id: string;
  title: string;
  excerpt: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryRecord {
  id: string;
  title: string;
  content: string;
  tags: string[];
  city?: string;
  operatorType?: OperatorType;
  createdAt: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  rationale: string;
  urgency: "now" | "next_30_min" | "next_2_hours" | "today";
  owner: string;
  requiresApproval: boolean;
  sourceBasis: SignalSource[];
  status: "pending" | "approved" | "rejected" | "draft";
}

export interface OpsPlan {
  id: string;
  matchId: string;
  operatorType: OperatorType;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  reasoning: string[];
  recommendedActions: RecommendedAction[];
  customerMessage?: string;
  operatorMessage?: string;
  generatedBy: "nebius";
  photonThreadId?: string;
  createdAt: string;
}

export interface PhotonMessageRecord {
  id: string;
  externalMessageId?: string;
  threadId: string;
  sender: string;
  direction: "inbound" | "outbound";
  body: string;
  parsedIntent?: string;
  payload?: unknown;
  createdAt: string;
}

export interface LiveCommandState {
  vendorStatus: VendorStatus;
  latestInboundMessage?: PhotonMessageRecord;
  latestOutboundMessage?: PhotonMessageRecord;
  selectedMatch?: MatchEvent;
  signals: Signal[];
  policies: RetrievedPolicy[];
  memories: MemoryRecord[];
  plan?: OpsPlan;
  timeline: AgentTimelineEvent[];
  auditEvents: AuditEvent[];
}

export interface VendorStatus {
  butterbase: "ok" | "error" | "missing";
  butterbaseRag: "ok" | "error" | "missing";
  evermind: "ok" | "error" | "missing";
  nebius: "ok" | "error" | "missing";
  photon: "ok" | "error" | "missing";
}

export interface AgentTimelineEvent {
  id: string;
  label: string;
  status: "pending" | "running" | "complete" | "error";
  detail?: string;
  vendor?: "Butterbase" | "Evermind" | "Nebius" | "Photon" | "OpenMeteo" | "GDELT" | "GTFS";
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  channel: "dashboard" | "photon_imessage" | "system";
  eventType: string;
  payload: unknown;
  createdAt: string;
}
