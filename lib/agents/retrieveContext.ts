import { getButterbaseAdapter } from "../integrations/butterbase";
import { getEvermindAdapter } from "../integrations/evermind";
import type { MatchEvent, MemoryRecord, OperatorType, RetrievedPolicy, Signal } from "../types";

export async function retrieveContext(input: {
  match: MatchEvent;
  operatorType: OperatorType;
  signals: Signal[];
}): Promise<{
  policies: RetrievedPolicy[];
  memories: MemoryRecord[];
}> {
  const riskHints = input.signals
    .filter((signal) => signal.severity !== "low")
    .map((signal) => signal.summary)
    .join(" ");
  const query = `High-demand World Cup match for ${input.operatorType} operator. ${input.match.homeTeam} vs ${input.match.awayTeam}. ${riskHints}. Need staffing, queue, inventory, and customer advisory policies. Find similar past event memories.`;

  const [policies, memories] = await Promise.all([
    getButterbaseAdapter().queryPolicies(query, 5),
    getEvermindAdapter().searchMemories({ query, topK: 5 })
  ]);

  return { policies, memories };
}
