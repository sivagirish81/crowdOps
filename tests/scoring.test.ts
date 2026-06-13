import { describe, expect, it } from "vitest";
import { seedMatches } from "../lib/data/seedMatches";
import { computeRiskScore } from "../lib/scoring";
import type { MemoryRecord, RetrievedPolicy, Signal } from "../lib/types";

const brazilMorocco = seedMatches.find((match) => match.homeTeam === "Brazil" && match.awayTeam === "Morocco");

describe("computeRiskScore", () => {
  it("accounts for high-impact live match events and operating context", () => {
    expect(brazilMorocco).toBeDefined();

    const signals: Signal[] = [
      {
        id: "signal_live",
        matchId: brazilMorocco!.id,
        source: "world_cup_live",
        type: "event_driven_offer_trigger",
        severity: "high",
        summary: "Penalty scored; offer trigger active.",
        createdAt: "2026-06-13T22:00:00.000Z"
      },
      {
        id: "signal_weather",
        matchId: brazilMorocco!.id,
        source: "weather",
        type: "weather",
        severity: "medium",
        summary: "Warm weather increases walk-in demand.",
        createdAt: "2026-06-13T22:00:00.000Z"
      }
    ];
    const memories: MemoryRecord[] = [
      {
        id: "memory_1",
        title: "Prior crowd spike",
        content: "Demand spike caused queue congestion and staffing escalation.",
        tags: ["crowd"],
        createdAt: "2026-06-01T00:00:00.000Z"
      }
    ];
    const policies: RetrievedPolicy[] = [
      {
        id: "policy_1",
        title: "Offer approval",
        excerpt: "Public promotions require shift manager approval before launch."
      }
    ];

    const risk = computeRiskScore({
      match: brazilMorocco!,
      signals,
      memories,
      policies
    });

    expect(risk.score).toBe(83);
    expect(risk.level).toBe("high");
    expect(risk.reasons).toEqual(
      expect.arrayContaining([
        "High-impact live match event detected.",
        "Operating policy requires approval or immediate action."
      ])
    );
  });
});
