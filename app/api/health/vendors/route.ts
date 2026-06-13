import { NextResponse } from "next/server";
import { requirePhotonConfig } from "../../../../lib/config";
import { getButterbaseAdapter } from "../../../../lib/integrations/butterbase";
import { getEvermindAdapter } from "../../../../lib/integrations/evermind";
import { assertNebiusReady } from "../../../../lib/integrations/nebius";
import type { VendorStatus } from "../../../../lib/types";

async function status(check: () => Promise<void>, missingToken: string) {
  try {
    await check();
    return "ok" as const;
  } catch (error) {
    return error instanceof Error && error.message.includes(missingToken) ? ("missing" as const) : ("error" as const);
  }
}

export async function GET() {
  const butterbase = await status(() => getButterbaseAdapter().assertReady(), "Missing required environment variables");
  const butterbaseRag = await status(() => getButterbaseAdapter().queryPolicies("staffing queue policy", 1).then(() => undefined), "Missing required environment variables");
  const evermind = await status(() => getEvermindAdapter().assertReady(), "Missing required environment variables");
  const nebius = await status(() => assertNebiusReady(), "Missing required environment variables");
  const photon = await status(async () => {
    requirePhotonConfig();
  }, "Missing required environment variables");

  const body: VendorStatus = { butterbase, butterbaseRag, evermind, nebius, photon };
  return NextResponse.json(body);
}
