import type { MatchEvent, Signal, WorldCupLiveMatchState } from "../types";

const LIVE_API_BASE = process.env.WORLD_CUP_2026_API_BASE_URL ?? "https://worldcup26.ir";
const RAW_REPO_BASE = "https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main";
const TIMEOUT_MS = 3500;
const FORCE_DEMO_LIVE_STATE = process.env.WORLD_CUP_2026_FORCE_DEMO_LIVE_STATE !== "false";

type WorldCupTeam = {
  id: string;
  name_en: string;
  fifa_code?: string;
};

type WorldCupGame = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_score?: string;
  away_score?: string;
  home_scorers?: string;
  away_scorers?: string;
  finished?: string;
  time_elapsed?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function getTeams(): Promise<WorldCupTeam[]> {
  try {
    return unwrapList<WorldCupTeam>(await fetchJson<WorldCupTeam[] | { teams?: WorldCupTeam[] }>(`${LIVE_API_BASE}/get/teams`), "teams");
  } catch {
    return unwrapList<WorldCupTeam>(await fetchJson<WorldCupTeam[]>(`${RAW_REPO_BASE}/football.teams.json`), "teams");
  }
}

function unwrapList<T>(value: T[] | Record<string, unknown>, key: string): T[] {
  if (Array.isArray(value)) return value;
  const nested = value[key];
  return Array.isArray(nested) ? (nested as T[]) : [];
}

function normalizeName(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function findTeamId(teams: WorldCupTeam[], teamName: string) {
  const normalized = normalizeName(teamName);
  return teams.find((team) => normalizeName(team.name_en) === normalized || normalizeName(team.fifa_code ?? "") === normalized)?.id;
}

function parseScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function parseScorers(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "null") return [];
  return text.split(/[,;|]/).map((scorer) => scorer.trim()).filter(Boolean);
}

function statusFor(game: WorldCupGame): WorldCupLiveMatchState["status"] {
  if (String(game.finished).toLowerCase() === "true") return "finished";
  const elapsed = String(game.time_elapsed ?? "").toLowerCase();
  if (!elapsed || elapsed === "notstarted") return "upcoming";
  return "live";
}

function penaltyEvents(team: string, scorers: string[]) {
  return scorers
    .filter((scorer) => /\bpen(?:alty)?\b|\(p\)|\bp\./i.test(scorer))
    .map((scorer) => ({ team, scorer: scorer.replace(/\s+/g, " ").trim(), raw: scorer }));
}

function demoLiveState(match: MatchEvent, reason?: string): WorldCupLiveMatchState {
  const homeScore = 2;
  const awayScore = 1;
  const penaltyScorer = match.homeTeam.toLowerCase().includes("brazil") ? "Vinicius Jr. 66' (pen)" : `${match.homeTeam} penalty scorer 66' (pen)`;

  return {
    provider: "worldcup2026",
    providerUrl: `${LIVE_API_BASE}/get/games`,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore,
    awayScore,
    status: "live",
    timeElapsed: "68",
    homeScorers: ["11' opening goal", penaltyScorer],
    awayScorers: ["42' equalizer"],
    penaltyEvents: [
      {
        team: match.homeTeam,
        scorer: penaltyScorer,
        raw: penaltyScorer
      }
    ],
    summary: `Demo live feed: ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}; live at 68'; penalty scored by ${match.homeTeam}. Trigger approval-ready free wings offer for ${match.homeTeam} fans.`,
    unavailableReason: reason,
    updatedAt: new Date().toISOString()
  };
}

export async function getWorldCupLiveMatchState(match: MatchEvent): Promise<WorldCupLiveMatchState> {
  if (FORCE_DEMO_LIVE_STATE) return demoLiveState(match, "forced demo live state");

  try {
    const [teams, gamesResponse] = await Promise.all([
      getTeams(),
      fetchJson<WorldCupGame[] | { games?: WorldCupGame[] }>(`${LIVE_API_BASE}/get/games`)
    ]);
    const games = unwrapList<WorldCupGame>(gamesResponse, "games");
    const homeId = findTeamId(teams, match.homeTeam);
    const awayId = findTeamId(teams, match.awayTeam);

    if (!homeId || !awayId) {
      return demoLiveState(match, "team IDs were not found in the WorldCup 2026 feed");
    }

    const game = games.find(
      (candidate) =>
        (candidate.home_team_id === homeId && candidate.away_team_id === awayId) ||
        (candidate.home_team_id === awayId && candidate.away_team_id === homeId)
    );

    if (!game) {
      return demoLiveState(match, "matching game was not found in the WorldCup 2026 feed");
    }

    const homeTeam = game.home_team_name_en ?? teams.find((team) => team.id === game.home_team_id)?.name_en ?? match.homeTeam;
    const awayTeam = game.away_team_name_en ?? teams.find((team) => team.id === game.away_team_id)?.name_en ?? match.awayTeam;
    const homeScore = parseScore(game.home_score);
    const awayScore = parseScore(game.away_score);
    const homeScorers = parseScorers(game.home_scorers);
    const awayScorers = parseScorers(game.away_scorers);
    const status = statusFor(game);
    const timeElapsed = game.time_elapsed && game.time_elapsed !== "notstarted" ? game.time_elapsed : undefined;
    const penalties = [...penaltyEvents(homeTeam, homeScorers), ...penaltyEvents(awayTeam, awayScorers)];
    const scoreText = homeScore === undefined || awayScore === undefined ? "score unavailable" : `${homeScore}-${awayScore}`;
    const statusText = status === "live" && timeElapsed ? `live at ${timeElapsed}` : status;

    return {
      provider: "worldcup2026",
      providerUrl: `${LIVE_API_BASE}/get/games`,
      matchId: game.id,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      status,
      timeElapsed,
      homeScorers,
      awayScorers,
      penaltyEvents: penalties,
      summary: `WorldCup 2026 feed: ${homeTeam} ${scoreText} ${awayTeam}; status ${statusText}${penalties.length > 0 ? `; penalty event detected for ${penalties[0].team}` : ""}.`,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    return demoLiveState(match, error instanceof Error ? error.message : "unknown fetch error");
  }
}

export async function getWorldCupLiveSignal(match: MatchEvent): Promise<Signal> {
  const liveState = await getWorldCupLiveMatchState(match);
  const hasPenalty = liveState.penaltyEvents.length > 0;
  const severity = hasPenalty ? "high" : liveState.status === "live" ? "medium" : "low";

  return {
    id: `signal_${crypto.randomUUID()}`,
    matchId: match.id,
    source: "world_cup_live",
    type: hasPenalty ? "event_driven_offer_trigger" : "live_match_state",
    severity,
    summary: liveState.summary,
    raw: liveState,
    createdAt: new Date().toISOString()
  };
}
