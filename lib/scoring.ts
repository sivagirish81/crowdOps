import type { MatchEvent, MemoryRecord, RetrievedPolicy, RiskLevel, Signal } from "./types";

function levelFor(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 85) return "high";
  return "critical";
}

function hoursUntil(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / (1000 * 60 * 60);
}

function hasSeverity(signals: Signal[], source: Signal["source"], severity: Signal["severity"]) {
  return signals.some((signal) => signal.source === source && signal.severity === severity);
}

export function computeRiskScore(input: {
  match: MatchEvent;
  signals: Signal[];
  memories: MemoryRecord[];
  policies: RetrievedPolicy[];
}): {
  score: number;
  level: RiskLevel;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;
  const hours = hoursUntil(input.match.startsAt);

  if (hours >= 0 && hours <= 3) {
    score += 25;
    reasons.push("Kickoff is within 3 hours.");
  } else if (hours >= 0 && hours <= 6) {
    score += 15;
    reasons.push("Kickoff is within 6 hours.");
  }

  if (input.match.expectedDemand === "very_high") {
    score += 20;
    reasons.push("Seeded World Cup match demand is very high.");
  } else if (input.match.expectedDemand === "high") {
    score += 15;
    reasons.push("Seeded World Cup match demand is high.");
  } else if (input.match.expectedDemand === "medium") {
    score += 10;
    reasons.push("Seeded World Cup match demand is medium.");
  }

  const sourceScores: Record<string, [number, string][]> = {
    weather: [
      [hasSeverity(input.signals, "weather", "critical") ? 20 : 0, "Critical weather signal detected."],
      [hasSeverity(input.signals, "weather", "high") ? 15 : 0, "High weather risk detected."],
      [hasSeverity(input.signals, "weather", "medium") ? 8 : 0, "Medium weather risk detected."]
    ],
    transit: [
      [hasSeverity(input.signals, "transit", "critical") ? 20 : 0, "Critical transit signal detected."],
      [hasSeverity(input.signals, "transit", "high") ? 15 : 0, "High transit risk detected."],
      [hasSeverity(input.signals, "transit", "medium") ? 8 : 0, "Medium transit risk detected."]
    ],
    news: [
      [hasSeverity(input.signals, "news", "critical") ? 15 : 0, "Critical news/event risk detected."],
      [hasSeverity(input.signals, "news", "high") ? 10 : 0, "High news/event risk detected."],
      [hasSeverity(input.signals, "news", "medium") ? 5 : 0, "Medium news/event signal detected."]
    ]
  };

  for (const entries of Object.values(sourceScores)) {
    const firstHit = entries.find(([points]) => points > 0);
    if (firstHit) {
      score += firstHit[0];
      reasons.push(firstHit[1]);
    }
  }

  if (input.memories.length > 0) {
    score += 10;
    reasons.push("Evermind returned similar operational memories.");
  }

  const memoryText = input.memories.map((memory) => `${memory.title} ${memory.content}`).join(" ").toLowerCase();
  if (/(demand spike|congestion|delay|rain|staffing|queue|escalation)/.test(memoryText)) {
    score += 15;
    reasons.push("Evermind memory mentions demand, congestion, delay, rain, staffing, queue, or escalation.");
  }

  if (input.policies.length > 0) {
    score += 5;
    reasons.push("Butterbase RAG returned relevant operating policies.");
  }

  const policyText = input.policies.map((policy) => `${policy.title} ${policy.excerpt}`).join(" ").toLowerCase();
  if (/(approval|immediate|requires|escalat)/.test(policyText)) {
    score += 10;
    reasons.push("Butterbase policy requires approval or immediate action.");
  }

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, level: levelFor(clamped), reasons };
}
