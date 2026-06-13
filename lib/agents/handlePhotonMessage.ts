import { VendorIntegrationError } from "../errors";
import { getButterbaseAdapter } from "../integrations/butterbase";
import { getEvermindAdapter } from "../integrations/evermind";
import { answerNebiusFollowUp } from "../integrations/nebius";
import type { OpsPlan, PhotonMessageRecord } from "../types";
import { generateOpsPlan } from "./generateOpsPlan";
import { handleApproval } from "./handleApproval";
import { parseOperatorMessage } from "./parseOperatorMessage";

function messageRecord(input: {
  externalMessageId?: string;
  threadId: string;
  sender: string;
  direction: "inbound" | "outbound";
  body: string;
  parsedIntent?: string;
  payload?: unknown;
}): PhotonMessageRecord {
  return {
    id: `msg_${crypto.randomUUID()}`,
    externalMessageId: input.externalMessageId,
    threadId: input.threadId,
    sender: input.sender,
    direction: input.direction,
    body: input.body,
    parsedIntent: input.parsedIntent,
    payload: input.payload,
    createdAt: new Date().toISOString()
  };
}

function formatAnalysisResponse(plan: OpsPlan) {
  const reasons = plan.reasoning.slice(0, 4).map((reason, index) => `${index + 1}. ${reason}`).join("\n");
  const actions = plan.recommendedActions.slice(0, 4).map((action, index) => `${index + 1}. ${action.title}`).join("\n");
  return `CrowdOps Risk: ${plan.riskLevel.toUpperCase()} ${plan.riskScore}/100

${plan.summary}

Why:
${reasons}

Recommended:
${actions}

Reply “approve all”, “approve 1”, or “reject”.`;
}

export async function handlePhotonMessage(input: {
  text: string;
  sender: string;
  threadId: string;
  externalMessageId?: string;
}): Promise<{ text: string }> {
  const butterbase = getButterbaseAdapter();
  await butterbase.assertReady();
  const parsed = parseOperatorMessage(input.text);
  console.log("CrowdOps parsed Photon message", {
    command: parsed.command,
    operatorType: parsed.operatorType,
    matchQuery: parsed.matchQuery,
    text: input.text.slice(0, 120),
    threadId: input.threadId
  });
  await butterbase.savePhotonMessage(
    messageRecord({
      externalMessageId: input.externalMessageId,
      threadId: input.threadId,
      sender: input.sender,
      direction: "inbound",
      body: input.text,
      parsedIntent: parsed.command,
      payload: parsed
    })
  );

  let responseText: string;

  if (parsed.command === "analyze") {
    const match = await butterbase.findMatchByTeams(parsed.matchQuery ?? input.text);
    if (!match) throw new VendorIntegrationError("Butterbase", "No seeded matches found.");
    const result = await generateOpsPlan({
      matchId: match.id,
      operatorType: parsed.operatorType,
      channel: "photon_imessage",
      photonThreadId: input.threadId
    });
    responseText = formatAnalysisResponse(result.plan);
  } else if (parsed.command === "approve") {
    const latestPlan = await butterbase.getLatestPendingPlanByThread(input.threadId);
    if (!latestPlan) {
      responseText = "No pending CrowdOps plan found for this iMessage thread.";
    } else {
      const selected =
        parsed.actionSelection === "all"
          ? latestPlan.recommendedActions.map((action) => action.id)
          : latestPlan.recommendedActions
              .filter((_, index) => Array.isArray(parsed.actionSelection) && parsed.actionSelection.includes(index + 1))
              .map((action) => action.id);
      await handleApproval({
        planId: latestPlan.id,
        approvedActionIds: selected,
        approveAll: parsed.actionSelection === "all",
        channel: "photon_imessage",
        actor: input.sender,
        photonThreadId: input.threadId,
        operatorNote: "Approved from iMessage"
      });
      responseText = `Approved.

Logged in Butterbase:
- actions approved
- audit event saved

Saved to Evermind:
“${latestPlan.summary}”

The next match day starts smarter.`;
    }
  } else if (parsed.command === "memory") {
    const memories = await getEvermindAdapter().searchMemories({ query: parsed.note ?? input.text, topK: 3 });
    responseText =
      memories.length === 0
        ? "No similar Evermind memories found yet."
        : `Similar Evermind memories:\n${memories.map((memory, index) => `${index + 1}. ${memory.title}: ${memory.content}`).join("\n")}`;
  } else if (parsed.command === "followup") {
    const latestPlan = await butterbase.getLatestPlanByThread(input.threadId);
    if (!latestPlan) {
      responseText = "I can answer follow-ups after I generate a match-day plan. Send “Analyze Brazil vs Morocco for my sports bar” first.";
    } else {
      const match = await butterbase.getMatchById(latestPlan.matchId);
      responseText = await answerNebiusFollowUp({
        question: input.text,
        plan: latestPlan,
        match
      });
    }
  } else {
    const latestPlan = await butterbase.getLatestPlanByThread(input.threadId);
    if (latestPlan) {
      const match = await butterbase.getMatchById(latestPlan.matchId);
      responseText = await answerNebiusFollowUp({
        question: input.text,
        plan: latestPlan,
        match
      });
    } else {
      responseText = "Send “Analyze Brazil vs Morocco for my sports bar” or reply “approve all” after a plan.";
    }
  }

  await butterbase.savePhotonMessage(
    messageRecord({
      threadId: input.threadId,
      sender: "CrowdOps AI",
      direction: "outbound",
      body: responseText,
      parsedIntent: parsed.command,
      payload: parsed
    })
  );

  return { text: responseText };
}
