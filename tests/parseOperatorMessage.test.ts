import { describe, expect, it } from "vitest";
import { parseOperatorMessage } from "../lib/agents/parseOperatorMessage";

describe("parseOperatorMessage", () => {
  it("extracts an analysis request for a sports bar match", () => {
    const parsed = parseOperatorMessage("Analyze Brazil vs Morocco for my sports bar");

    expect(parsed).toMatchObject({
      command: "analyze",
      operatorType: "sports_bar",
      matchQuery: "Brazil Morocco"
    });
  });

  it("routes penalty promo questions as follow-ups", () => {
    const parsed = parseOperatorMessage("Suggest a promo if either team scores a penalty");

    expect(parsed.command).toBe("followup");
    expect(parsed.operatorType).toBe("sports_bar");
  });

  it("parses selected approvals", () => {
    const parsed = parseOperatorMessage("approve 1 and 3");

    expect(parsed).toMatchObject({
      command: "approve",
      actionSelection: [1, 3]
    });
  });
});
