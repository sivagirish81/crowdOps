import type { MatchEvent } from "../types";

export const seedMatches: MatchEvent[] = [
  {
    id: "00000000-0000-4000-8000-000000000613",
    homeTeam: "Brazil",
    awayTeam: "Morocco",
    cityId: "los-angeles",
    cityName: "Los Angeles",
    venue: "SoFi Stadium",
    startsAt: "2026-06-13T18:00:00-07:00",
    expectedDemand: "very_high",
    status: "scheduled"
  },
  {
    id: "00000000-0000-4000-8000-000000000612",
    homeTeam: "United States",
    awayTeam: "Paraguay",
    cityId: "ny-nj",
    cityName: "New York/New Jersey",
    venue: "MetLife Stadium",
    startsAt: "2026-06-12T21:00:00-04:00",
    expectedDemand: "very_high",
    status: "scheduled"
  },
  {
    id: "00000000-0000-4000-8000-000000000611",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    cityId: "dallas",
    cityName: "Dallas",
    venue: "AT&T Stadium",
    startsAt: "2026-06-11T15:00:00-05:00",
    expectedDemand: "high",
    status: "scheduled"
  },
  {
    id: "00000000-0000-4000-8000-000000000616",
    homeTeam: "Argentina",
    awayTeam: "Algeria",
    cityId: "miami",
    cityName: "Miami",
    venue: "Hard Rock Stadium",
    startsAt: "2026-06-16T21:00:00-04:00",
    expectedDemand: "very_high",
    status: "scheduled"
  },
  {
    id: "00000000-0000-4000-8000-000000000617",
    homeTeam: "England",
    awayTeam: "Croatia",
    cityId: "seattle",
    cityName: "Seattle",
    venue: "Lumen Field",
    startsAt: "2026-06-17T16:00:00-07:00",
    expectedDemand: "high",
    status: "scheduled"
  },
  {
    id: "00000000-0000-4000-8000-000000000627",
    homeTeam: "Portugal",
    awayTeam: "Colombia",
    cityId: "bay-area",
    cityName: "San Francisco Bay Area",
    venue: "Levi's Stadium",
    startsAt: "2026-06-27T19:30:00-07:00",
    expectedDemand: "very_high",
    status: "scheduled"
  }
];
