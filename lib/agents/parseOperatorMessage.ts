import type { OperatorType } from "../types";

export type ParsedCommand = {
  command: "analyze" | "approve" | "reject" | "memory" | "followup" | "unknown";
  operatorType: OperatorType;
  matchQuery?: string;
  actionSelection?: "all" | number[];
  note?: string;
};

export function parseOperatorMessage(text: string): ParsedCommand {
  const lower = text.toLowerCase();
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

  if (/(what'?s happening|whats happening|who'?s winning|whose winning|score|winning|offer|offers|promo|promotion|discount|deal|happy hour|should i|can i|what do i do next)/.test(lower)) {
    return { command: "followup", operatorType, note: text };
  }

  if (/(analy[sz]e|analyse|check|risk plan|what should i do|game|match|brazil|morocco|moroncco)/.test(lower)) {
    const versus = text.match(/([A-Za-z ]+)\s+v(?:s|\.)?\s+([A-Za-z ]+)/i);
    const forMy = text.match(/(?:analy[sz]e|analyse|check|risk plan for|before)\s+(.+?)(?:\s+for my|\?|$)/i);
    return {
      command: "analyze",
      operatorType,
      matchQuery: versus ? `${versus[1].trim()} ${versus[2].trim()}` : forMy?.[1]?.trim() ?? text
    };
  }

  return { command: "unknown", operatorType };
}
