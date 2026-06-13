import { VendorIntegrationError } from "../errors";
import { getButterbaseAdapter } from "../integrations/butterbase";
import { getEvermindAdapter } from "../integrations/evermind";
import { assertNebiusReady, generateNebiusOpsPlan } from "../integrations/nebius";
import { computeRiskScore } from "../scoring";
import type { MatchEvent, MemoryRecord, OperatorType, OpsPlan, RetrievedPolicy, Signal } from "../types";
import { collectSignals } from "./collectSignals";
import { retrieveContext } from "./retrieveContext";

export async function generateOpsPlan(input: {
  matchId: string;
  operatorType: OperatorType;
  channel: "dashboard" | "photon_imessage";
  photonThreadId?: string;
}): Promise<{
  match: MatchEvent;
  signals: Signal[];
  policies: RetrievedPolicy[];
  memories: MemoryRecord[];
  plan: OpsPlan;
}> {
  const butterbase = getButterbaseAdapter();
  const evermind = getEvermindAdapter();

  await butterbase.assertReady();
  await evermind.assertReady();
  await assertNebiusReady();

  const match = await butterbase.getMatchById(input.matchId);
  if (!match) {
    throw new VendorIntegrationError("Butterbase", `Match not found: ${input.matchId}`);
  }

  const signals = await collectSignals({ match, operatorType: input.operatorType });
  const { policies, memories } = await retrieveContext({ match, operatorType: input.operatorType, signals });
  const risk = computeRiskScore({ match, signals, memories, policies });
  const plan = await generateNebiusOpsPlan({
    match,
    operatorType: input.operatorType,
    signals,
    policies,
    memories,
    deterministicRiskScore: risk.score,
    deterministicRiskLevel: risk.level,
    deterministicReasons: risk.reasons,
    photonThreadId: input.photonThreadId
  });

  await butterbase.saveOpsPlan(plan);
  await Promise.all(plan.recommendedActions.map((action) => butterbase.saveAction({ ...action, planId: plan.id })));
  await butterbase.saveAuditLog({
    actor: "crowdops-agent",
    channel: input.channel,
    eventType: "ops_plan_generated",
    payload: { planId: plan.id, matchId: match.id, riskScore: plan.riskScore, riskLevel: plan.riskLevel }
  });

  return { match, signals, policies, memories, plan };
}
