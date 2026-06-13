import { opsPolicyDocs } from "../lib/data/opsPolicyDocs";
import { getButterbaseAdapter } from "../lib/integrations/butterbase";

async function main() {
  const butterbase = getButterbaseAdapter();
  await butterbase.assertReady();
  await butterbase.createRagCollectionIfMissing();
  for (const doc of opsPolicyDocs) await butterbase.ingestPolicyDocument(doc);
  const results = await butterbase.queryPolicies("high demand sports bar queue staffing customer advisory", 3);
  if (results.length === 0) throw new Error("Butterbase RAG query returned no policy documents.");
  console.log(`Seeded ${opsPolicyDocs.length} Butterbase RAG policy documents.`);
  console.log(`Verified ${results.length} RAG results.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
