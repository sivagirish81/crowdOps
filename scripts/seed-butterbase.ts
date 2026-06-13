import { cities } from "../lib/data/cityCoordinates";
import { seedMatches } from "../lib/data/seedMatches";
import { getButterbaseAdapter } from "../lib/integrations/butterbase";

async function main() {
  const butterbase = getButterbaseAdapter();
  await butterbase.assertReady();
  for (const city of cities) await butterbase.upsertCity(city);
  for (const match of seedMatches) await butterbase.upsertMatch(match);
  const matches = await butterbase.listMatches();
  console.log(`Seeded ${cities.length} cities and ${seedMatches.length} matches.`);
  console.log(`Verified ${matches.length} matches in Butterbase.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
