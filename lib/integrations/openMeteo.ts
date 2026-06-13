import type { City, MatchEvent, Signal } from "../types";

function id() {
  return `signal_${crypto.randomUUID()}`;
}

function mph(kmh: number) {
  return kmh * 0.621371;
}

export async function getWeatherSignal(city: City, match: MatchEvent): Promise<Signal> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(city.latitude));
    url.searchParams.set("longitude", String(city.longitude));
    url.searchParams.set("hourly", "temperature_2m,precipitation_probability,wind_speed_10m");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("timezone", city.timezone);
    url.searchParams.set("forecast_days", "3");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = (await response.json()) as {
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        precipitation_probability?: number[];
        wind_speed_10m?: number[];
      };
    };

    const times = payload.hourly?.time ?? [];
    const kickoff = new Date(match.startsAt).getTime();
    const index = times.reduce((best, time, current) => {
      const distance = Math.abs(new Date(time).getTime() - kickoff);
      const bestDistance = Math.abs(new Date(times[best] ?? time).getTime() - kickoff);
      return distance < bestDistance ? current : best;
    }, 0);

    const temp = payload.hourly?.temperature_2m?.[index] ?? 0;
    const rain = payload.hourly?.precipitation_probability?.[index] ?? 0;
    const windMph = mph(payload.hourly?.wind_speed_10m?.[index] ?? 0);
    const severity =
      rain > 50 || windMph > 25 || temp > 95 ? "high" : rain > 30 || windMph > 15 || temp > 85 ? "medium" : "low";

    return {
      id: id(),
      matchId: match.id,
      source: "weather",
      type: "open_meteo_forecast",
      severity,
      summary: `Forecast near kickoff: ${Math.round(temp)}°F, ${Math.round(rain)}% rain, ${Math.round(windMph)} mph wind.`,
      raw: payload,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: id(),
      matchId: match.id,
      source: "weather",
      type: "open_meteo_unavailable",
      severity: "low",
      summary: "Weather unavailable.",
      raw: error instanceof Error ? { message: error.message } : undefined,
      createdAt: new Date().toISOString()
    };
  }
}
