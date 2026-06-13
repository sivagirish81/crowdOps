import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApproval } from "../../../lib/agents/handleApproval";

const schema = z.object({
  planId: z.string(),
  approveAll: z.boolean().optional(),
  approvedActionIds: z.array(z.string()).default([]),
  channel: z.enum(["dashboard", "photon_imessage"]).default("dashboard"),
  actor: z.string().default("demo-operator"),
  operatorNote: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await handleApproval(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
