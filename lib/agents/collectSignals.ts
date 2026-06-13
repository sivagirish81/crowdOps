import { cities } from "../data/cityCoordinates";
import { VendorIntegrationError } from "../errors";
import { getButterbaseAdapter } from "../integrations/butterbase";
import { getNewsSignal } from "../integrations/gdelt";
import { getTransitSignal } from "../integrations/gtfs";
import { getWeatherSignal } from "../integrations/openMeteo";
import type { MatchEvent, OperatorType, Signal } from "../types";

export async function collectSignals(input: {
  match: MatchEvent;
  operatorType: OperatorType;
}): Promise<Signal[]> {
  const city = cities.find((candidate) => candidate.id === input.match.cityId);
  if (!city) {
    throw new VendorIntegrationError("Butterbase", `No seeded city coordinates for ${input.match.cityId}.`);
  }

  const matchSignal: Signal = {
    id: `signal_${crypto.randomUUID()}`,
    matchId: input.match.id,
    source: "world_cup_schedule",
    type: "seeded_match_context",
    severity: input.match.expectedDemand === "very_high" ? "high" : input.match.expectedDemand === "high" ? "medium" : "low",
    summary: `${input.match.homeTeam} vs ${input.match.awayTeam} at ${input.match.venue}; expected demand is ${input.match.expectedDemand}.`,
    raw: { match: input.match, operatorType: input.operatorType },
    createdAt: new Date().toISOString()
  };

  const [weather, news, transit] = await Promise.all([
    getWeatherSignal(city, input.match),
    getNewsSignal(city, input.match),
    getTransitSignal(city)
  ]);

  const signals = [matchSignal, weather, news, { ...transit, matchId: input.match.id }];
  const butterbase = getButterbaseAdapter();
  await Promise.all(signals.map((signal) => butterbase.saveSignal(signal)));
  return signals;
}
