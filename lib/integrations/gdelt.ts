import type { City, MatchEvent, Signal } from "../types";

const riskTerms = /(traffic|crowd|crowding|delay|delays|safety|protest|weather|disruption|transit|storm|rain)/i;

export async function getNewsSignal(city: City, match: MatchEvent): Promise<Signal> {
  try {
    const terms = [
      city.name,
      match.venue,
      "World Cup",
      "traffic",
      "crowd",
      "transit",
      "weather",
      "fan zone"
    ];
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.searchParams.set("query", terms.map((term) => `"${term}"`).join(" OR "));
    url.searchParams.set("mode", "ArtList");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", "20");
    url.searchParams.set("sort", "DateDesc");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = (await response.json()) as { articles?: { title?: string; seendate?: string; url?: string }[] };
    const articles = payload.articles ?? [];
    const risky = articles.filter((article) => riskTerms.test(article.title ?? ""));
    const severity = risky.length >= 3 ? "high" : risky.length >= 1 || articles.length >= 5 ? "medium" : "low";

    return {
      id: `signal_${crypto.randomUUID()}`,
      matchId: match.id,
      source: "news",
      type: "gdelt_event_risk",
      severity,
      summary:
        severity === "low"
          ? "No major recent local news/event risk found."
          : `${risky.length || articles.length} recent GDELT article signals mention local event, weather, crowd, traffic, or transit risk.`,
      raw: { articles: articles.slice(0, 5) },
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: `signal_${crypto.randomUUID()}`,
      matchId: match.id,
      source: "news",
      type: "gdelt_unavailable",
      severity: "low",
      summary: "News/event signal unavailable.",
      raw: error instanceof Error ? { message: error.message } : undefined,
      createdAt: new Date().toISOString()
    };
  }
}
