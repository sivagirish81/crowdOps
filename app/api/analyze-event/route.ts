import { NextResponse } from "next/server";
import { z } from "zod";
import { generateOpsPlan } from "../../../lib/agents/generateOpsPlan";

const schema = z.object({
  matchId: z.string(),
  operatorType: z.enum(["sports_bar", "fan_zone", "hotel", "venue_ops"]).default("sports_bar"),
  channel: z.enum(["dashboard", "photon_imessage"]).default("dashboard")
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await generateOpsPlan(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
