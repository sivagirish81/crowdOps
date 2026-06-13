import { requirePhotonConfig } from "../lib/config";
import { getButterbaseAdapter } from "../lib/integrations/butterbase";
import { getEvermindAdapter } from "../lib/integrations/evermind";
import { assertNebiusReady } from "../lib/integrations/nebius";

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    return { vendor: name, status: "ok" };
  } catch (error) {
    return { vendor: name, status: error instanceof Error ? error.message : "error" };
  }
}

async function main() {
  const rows = await Promise.all([
    check("Butterbase", () => getButterbaseAdapter().assertReady()),
    check("Butterbase RAG", () => getButterbaseAdapter().queryPolicies("staffing policy", 1).then(() => undefined)),
    check("Evermind", () => getEvermindAdapter().assertReady()),
    check("Nebius", () => assertNebiusReady()),
    check("Photon", async () => {
      requirePhotonConfig();
    })
  ]);
  console.table(rows);
  if (rows.some((row) => row.status !== "ok")) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
