import type { OperatorType } from "../types";

export type ParsedCommand = {
  command: "analyze" | "approve" | "reject" | "memory" | "followup" | "unknown";
  operatorType: OperatorType;
  matchQuery?: string;
  actionSelection?: "all" | number[];
  note?: string;
};

function cleanMatchQuery(value: string) {
  return value
    .replace(/^(analy[sz]e|analyse|check|risk plan for|risk plan|before)\s+/i, "")
    .replace(/\s+for my\s+.+$/i, "")
    .replace(/\?+$/g, "")
    .trim();
}

export function parseOperatorMessage(text: string): ParsedCommand {
  const lower = text.toLowerCase().replace(/[’‘]/g, "'");
  const operatorType: OperatorType = lower.includes("fan zone")
    ? "fan_zone"
    : lower.includes("hotel")
    ? "hotel"
    : lower.includes("venue")
    ? "venue_ops"
    : "sports_bar";

  if (/(approve|approved)/.test(lower)) {
    const numbers = Array.from(lower.matchAll(/\b(\d+)\b/g)).map((match) => Number(match[1]));
    return {
      command: "approve",
      operatorType,
      actionSelection: lower.includes("all") || numbers.length === 0 ? "all" : numbers
    };
  }

  if (/(reject|save draft|draft)/.test(lower)) {
    return { command: lower.includes("draft") ? "reject" : "reject", operatorType, note: text };
  }

  if (/(what happened last time|similar memories|remember that)/.test(lower)) {
    return { command: "memory", operatorType, note: text };
  }

  if (/(what'?s happening|whats happening|happening in (the )?match|who'?s winning|whose winning|score|winning|penalty|wings|suggest|suggestion|idea|offer|offers|promo|promotion|discount|deal|happy hour|tomorrow|next day|next match day|plan for|should i|can i|what do i do next)/.test(lower)) {
    return { command: "followup", operatorType, note: text };
  }

  if (/(analy[sz]e|analyse|check|risk plan|what should i do|game|match|brazil|morocco|moroncco)/.test(lower)) {
    const versus = text.match(/([A-Za-z ]+)\s+v(?:s|\.)?\s+([A-Za-z ]+)/i);
    const forMy = text.match(/(?:analy[sz]e|analyse|check|risk plan for|before)\s+(.+?)(?:\s+for my|\?|$)/i);
    const matchQuery = versus ? `${cleanMatchQuery(versus[1])} ${cleanMatchQuery(versus[2])}` : forMy?.[1]?.trim() ?? text;
    return {
      command: "analyze",
      operatorType,
      matchQuery
    };
  }

  return { command: "unknown", operatorType };
}
