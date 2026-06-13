import { getEvermindAdapter } from "../lib/integrations/evermind";
import type { OperatorType } from "../lib/types";

const memories = [
  {
    title: "Brazil match-day demand spike",
    content: "Brazil match days caused roughly 2x walk-in demand and pickup queue overload. Splitting pickup and dine-in queues reduced congestion.",
    tags: ["brazil", "demand_spike", "sports_bar", "queue"],
    operatorType: "sports_bar" as OperatorType
  },
  {
    title: "Rain before kickoff caused outdoor congestion",
    content: "Rain before an evening kickoff caused outdoor queue congestion. Covered queues and indoor pickup staging helped.",
    tags: ["rain", "queue", "weather", "fan_zone"],
    operatorType: "fan_zone" as OperatorType
  },
  {
    title: "Transit delay advisory timing",
    content: "Transit delays required customer advisory at least 2 hours before kickoff. Late advisories were less effective.",
    tags: ["transit", "customer_advisory", "timing"]
  },
  {
    title: "High-profile match approval requirement",
    content: "High-profile rivalry matches required manager approval before public messaging or major staffing changes.",
    tags: ["approval", "manager", "high_demand"]
  },
  {
    title: "Fan-zone weather prep",
    content: "Fan-zone weather incidents improved when covered queues and hydration stations were prepared before gates opened.",
    tags: ["fan_zone", "weather", "hydration", "crowd_flow"],
    operatorType: "fan_zone" as OperatorType
  }
];

async function main() {
  const evermind = getEvermindAdapter();
  await evermind.assertReady();
  for (const memory of memories) await evermind.addMemory(memory);
  const results = await evermind.searchMemories({ query: "Brazil demand spike sports bar queue", topK: 3 });
  if (results.length === 0) throw new Error("Evermind search returned no seeded memories.");
  console.log(`Seeded ${memories.length} Evermind memories.`);
  console.log(`Verified ${results.length} Evermind search results.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
