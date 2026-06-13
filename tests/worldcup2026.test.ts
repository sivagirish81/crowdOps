import { describe, expect, it } from "vitest";
import { seedMatches } from "../lib/data/seedMatches";
import { getWorldCupLiveMatchState, getWorldCupLiveSignal } from "../lib/integrations/worldcup2026";

const brazilMorocco = seedMatches.find((match) => match.homeTeam === "Brazil" && match.awayTeam === "Morocco");

describe("World Cup 2026 demo context", () => {
  it("includes the full 104-match schedule and Brazil vs Morocco fixture", () => {
    expect(seedMatches).toHaveLength(104);
    expect(brazilMorocco).toMatchObject({
      id: "00000000-0000-4000-8000-000000000007",
      cityName: "New York/New Jersey",
      expectedDemand: "very_high"
    });
  });

  it("returns the hardcoded live penalty state by default", async () => {
    expect(brazilMorocco).toBeDefined();

    const liveState = await getWorldCupLiveMatchState(brazilMorocco!);

    expect(liveState).toMatchObject({
      status: "live",
      homeScore: 2,
      awayScore: 1,
      timeElapsed: "68"
    });
    expect(liveState.penaltyEvents[0]).toMatchObject({
      team: "Brazil",
      scorer: "Vinicius Jr. 66' (pen)"
    });
    expect(liveState.summary).toContain("free wings offer");
  });

  it("promotes penalty state to a high-severity live signal", async () => {
    expect(brazilMorocco).toBeDefined();

    const signal = await getWorldCupLiveSignal(brazilMorocco!);

    expect(signal).toMatchObject({
      source: "world_cup_live",
      type: "event_driven_offer_trigger",
      severity: "high"
    });
  });
});
