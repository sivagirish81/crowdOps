import { VendorIntegrationError } from "../errors";
import { getButterbaseAdapter } from "../integrations/butterbase";
import { getEvermindAdapter } from "../integrations/evermind";
import { answerNebiusFollowUp } from "../integrations/nebius";
import { getWorldCupLiveMatchState } from "../integrations/worldcup2026";
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

function userFacingText(text: string) {
  return text
    .replace(/\bButterbase RAG\b/gi, "operating policy")
    .replace(/\bButterbase\b/gi, "CrowdOps")
    .replace(/\bEvermind\b/gi, "CrowdOps memory")
    .replace(/\bNebius\b/gi, "CrowdOps AI")
    .replace(/\bPhoton\b/gi, "iMessage");
}

async function answerFollowUpWithLiveContext(input: {
  question: string;
  plan: OpsPlan;
}) {
  const match = await getButterbaseAdapter().getMatchById(input.plan.matchId);
  const liveMatchState = match ? await getWorldCupLiveMatchState(match) : null;
  return answerNebiusFollowUp({
    question: input.question,
    plan: input.plan,
    match,
    liveMatchState
  });
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
      const approvedActions =
        selected.length === 0
          ? latestPlan.recommendedActions
          : latestPlan.recommendedActions.filter((action) => selected.includes(action.id));
      const actionLines = approvedActions.slice(0, 4).map((action, index) => `${index + 1}. ${action.title}`).join("\n");
      responseText = `Action approved.

What happens next:
${actionLines || "1. The approved operating plan will be activated."}

CrowdOps will queue the approved steps for the team, prepare the customer message if one was approved, and keep the next match-day plan updated.`;
    }
  } else if (parsed.command === "memory") {
    const memories = await getEvermindAdapter().searchMemories({ query: parsed.note ?? input.text, topK: 3 });
    responseText =
      memories.length === 0
        ? "No similar operating memories found yet."
        : `Similar operating memories:\n${memories.map((memory, index) => `${index + 1}. ${memory.title}: ${memory.content}`).join("\n")}`;
  } else if (parsed.command === "followup") {
    const latestPlan = await butterbase.getLatestPlanByThread(input.threadId);
    if (!latestPlan) {
      responseText = "I can answer follow-ups after I generate a match-day plan. Send “Analyze Brazil vs Morocco for my sports bar” first.";
    } else {
      responseText = await answerFollowUpWithLiveContext({ question: input.text, plan: latestPlan });
    }
  } else {
    const latestPlan = await butterbase.getLatestPlanByThread(input.threadId);
    if (latestPlan) {
      responseText = await answerFollowUpWithLiveContext({ question: input.text, plan: latestPlan });
    } else {
      responseText = "Send “Analyze Brazil vs Morocco for my sports bar” or reply “approve all” after a plan.";
    }
  }

  responseText = userFacingText(responseText);

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
