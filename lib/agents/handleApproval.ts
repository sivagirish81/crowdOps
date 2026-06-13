import { getButterbaseAdapter } from "../integrations/butterbase";
import { getEvermindAdapter } from "../integrations/evermind";
import type { MemoryRecord } from "../types";

export async function handleApproval(input: {
  planId: string;
  approvedActionIds?: string[];
  approveAll?: boolean;
  channel: "dashboard" | "photon_imessage";
  actor: string;
  photonThreadId?: string;
  operatorNote?: string;
}): Promise<{
  approvedActionIds: string[];
  memory: MemoryRecord;
}> {
  const butterbase = getButterbaseAdapter();
  const evermind = getEvermindAdapter();
  await butterbase.assertReady();
  await evermind.assertReady();

  const plan =
    input.planId
      ? await butterbase.getOpsPlanById(input.planId)
      : input.photonThreadId
      ? await butterbase.getLatestPendingPlanByThread(input.photonThreadId)
      : null;

  const actionIds =
    input.approveAll && plan
      ? plan.recommendedActions.map((action) => action.id)
      : input.approvedActionIds ?? [];

  await Promise.all(actionIds.map((actionId) => butterbase.updateActionStatus(actionId, "approved")));
  await butterbase.saveAuditLog({
    actor: input.actor,
    channel: input.channel,
    eventType: "actions_approved",
    payload: {
      planId: input.planId || plan?.id,
      actionIds,
      approveAll: input.approveAll,
      operatorNote: input.operatorNote
    }
  });

  const memory = await evermind.addMemory({
    title: "CrowdOps approved match-day plan",
    content: `For ${plan?.matchId ?? input.planId}, CrowdOps recommended ${actionIds.length} actions. Operator approved via ${input.channel}. Key context: ${input.operatorNote ?? "approved operations plan"}. This should inform future match-day operations.`,
    tags: ["crowdops", "approval", "match_day", "operations"],
    sessionId: input.photonThreadId
  });

  return { approvedActionIds: actionIds, memory };
}
