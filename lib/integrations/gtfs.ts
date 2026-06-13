import { serverConfig } from "../config";
import type { City, Signal } from "../types";

export async function getTransitSignal(city: City): Promise<Signal> {
  if (!serverConfig.GTFS_ALERTS_URL) {
    return {
      id: `signal_${crypto.randomUUID()}`,
      matchId: "unknown",
      source: "transit",
      type: "gtfs_not_configured",
      severity: "low",
      summary: "GTFS transit alerts not configured.",
      createdAt: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(serverConfig.GTFS_ALERTS_URL);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const text = await response.text();
    const lower = text.toLowerCase();
    const alertCount = (lower.match(/delay|disruption|cancel|closed|alert/g) ?? []).length;
    const severity = alertCount > 10 ? "high" : alertCount > 2 ? "medium" : "low";

    return {
      id: `signal_${crypto.randomUUID()}`,
      matchId: "unknown",
      source: "transit",
      type: "gtfs_realtime_alerts",
      severity,
      summary:
        severity === "low"
          ? `No major GTFS alert keywords found for ${city.name}.`
          : `GTFS alerts include ${alertCount} disruption keywords near ${city.name}.`,
      raw: { alertKeywordCount: alertCount },
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: `signal_${crypto.randomUUID()}`,
      matchId: "unknown",
      source: "transit",
      type: "gtfs_unavailable",
      severity: "low",
      summary: "GTFS transit alerts unavailable.",
      raw: error instanceof Error ? { message: error.message } : undefined,
      createdAt: new Date().toISOString()
    };
  }
}
