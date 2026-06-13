import { requireEvermindConfig } from "../config";
import { VendorIntegrationError } from "../errors";
import type { MemoryRecord, OperatorType } from "../types";

export interface EvermindAdapter {
  assertReady(): Promise<void>;
  searchMemories(input: {
    query: string;
    topK?: number;
    memoryTypes?: string[];
  }): Promise<MemoryRecord[]>;
  addMemory(input: {
    title: string;
    content: string;
    tags: string[];
    city?: string;
    operatorType?: OperatorType;
    sessionId?: string;
  }): Promise<MemoryRecord>;
}

function unwrapItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.memories)) return obj.memories as Record<string, unknown>[];
    if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
    if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).results)) {
      return (obj.data as Record<string, unknown>).results as Record<string, unknown>[];
    }
    if (obj.data && typeof obj.data === "object") {
      const data = obj.data as Record<string, unknown>;
      return [
        ...(Array.isArray(data.episodes) ? (data.episodes as Record<string, unknown>[]) : []),
        ...(Array.isArray(data.profiles) ? (data.profiles as Record<string, unknown>[]) : []),
        ...(Array.isArray(data.raw_messages) ? (data.raw_messages as Record<string, unknown>[]) : [])
      ];
    }
    if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).memories)) {
      return (obj.data as Record<string, unknown>).memories as Record<string, unknown>[];
    }
  }
  return [];
}

function toMemory(row: Record<string, unknown>, index = 0): MemoryRecord {
  const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
  return {
    id: String(row.id ?? row.memory_id ?? `memory_${index}`),
    title: String(row.title ?? metadata.title ?? "Evermind memory"),
    content: String(row.content ?? row.text ?? row.memory ?? row.summary ?? row.chunk ?? row.message ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : Array.isArray(metadata.tags) ? metadata.tags.map(String) : [],
    city: row.city ? String(row.city) : metadata.city ? String(metadata.city) : undefined,
    operatorType: (row.operatorType ?? row.operator_type ?? metadata.operatorType) as OperatorType | undefined,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString())
  };
}

class HttpEvermindAdapter implements EvermindAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly userId: string;

  constructor() {
    const config = requireEvermindConfig();
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.userId = config.userId;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new VendorIntegrationError("Evermind", `${response.status} ${response.statusText}: ${text}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async assertReady() {
    await this.searchMemories({ query: "CrowdOps readiness check", topK: 1 });
  }

  async searchMemories(input: {
    query: string;
    topK?: number;
    memoryTypes?: string[];
  }) {
    const payload = await this.request(`/api/v1/memories/search`, {
      method: "POST",
      body: JSON.stringify({
        query: input.query,
        filters: { user_id: this.userId },
        top_k: input.topK ?? 5,
        memory_types: input.memoryTypes ?? ["raw_message", "episodic_memory", "profile"],
        retrieve_method: "hybrid"
      })
    });
    return unwrapItems(payload).map(toMemory);
  }

  async addMemory(input: {
    title: string;
    content: string;
    tags: string[];
    city?: string;
    operatorType?: OperatorType;
    sessionId?: string;
  }) {
    await this.request(`/api/v1/memories`, {
      method: "POST",
      body: JSON.stringify({
        user_id: this.userId,
        session_id: input.sessionId,
        async_mode: false,
        messages: [
          {
            sender_id: this.userId,
            role: "user",
            timestamp: Date.now(),
            content: `${input.title}\n\n${input.content}\n\nTags: ${input.tags.join(", ")}${input.city ? `\nCity: ${input.city}` : ""}${input.operatorType ? `\nOperator type: ${input.operatorType}` : ""}`
          }
        ]
      })
    });
    return {
      id: `memory_${crypto.randomUUID()}`,
      title: input.title,
      content: input.content,
      tags: input.tags,
      city: input.city,
      operatorType: input.operatorType,
      createdAt: new Date().toISOString()
    };
  }
}

let adapter: EvermindAdapter | undefined;

export function getEvermindAdapter(): EvermindAdapter {
  adapter ??= new HttpEvermindAdapter();
  return adapter;
}
