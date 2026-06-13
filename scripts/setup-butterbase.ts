import { requireButterbaseConfig } from "../lib/config";
import { getButterbaseAdapter } from "../lib/integrations/butterbase";

const schema = `
Create these Butterbase tables if your workspace does not auto-create rows:

cities(id text primary key, name text, region text, country text, latitude number, longitude number, timezone text, created_at timestamp)
matches(id text primary key, home_team text, away_team text, city_id text, city_name text, venue text, starts_at timestamp, expected_demand text, status text, created_at timestamp)
signals(id text primary key, match_id text, source text, type text, severity text, summary text, raw_payload json, created_at timestamp)
ops_plans(id text primary key, match_id text, operator_type text, risk_score number, risk_level text, summary text, reasoning json, recommended_actions json, customer_message text, operator_message text, generated_by text, photon_thread_id text, created_at timestamp)
actions(id text primary key, plan_id text, title text, status text, requires_approval boolean, owner text, payload json, created_at timestamp, updated_at timestamp)
audit_logs(id text primary key, actor text, channel text, event_type text, payload json, created_at timestamp)
photon_messages(id text primary key, external_message_id text, thread_id text, sender text, direction text, body text, parsed_intent text, payload json, created_at timestamp)
`;

async function main() {
  requireButterbaseConfig();
  const butterbase = getButterbaseAdapter();
  await butterbase.assertReady();
  console.log("Butterbase connection verified.");
  console.log(schema);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
