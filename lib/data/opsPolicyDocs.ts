export const opsPolicyDocs = [
  {
    filename: "sports_bar_matchday_policy.md",
    metadata: { operatorType: "sports_bar", category: "matchday" },
    text: `# Sports Bar Matchday Policy

- High-demand matches require 20-40% additional floor staff.
- If kickoff is within 3 hours, staffing decision should be made immediately.
- Split pickup and dine-in queues when high-demand match and weather/transit risk overlap.
- Prepare high-demand inventory: beer, wings, fries, bottled water, non-alcoholic drinks.
- Public customer messages require manager approval.
- Transit disruption requires a customer advisory.`
  },
  {
    filename: "fan_zone_weather_policy.md",
    metadata: { operatorType: "fan_zone", category: "weather" },
    text: `# Fan Zone Weather Policy

- Rain probability above 40% requires covered queue setup.
- Wind above 20 mph requires signage and tent review.
- Heat above 90°F requires hydration stations.
- Severe weather requires escalation to operations lead.
- Weather plus high demand increases crowd-flow risk.`
  },
  {
    filename: "transit_disruption_response.md",
    metadata: { category: "transit" },
    text: `# Transit Disruption Response

- Active transit alerts near the venue require guest/customer advisory.
- Recommend earlier arrival if delays overlap with kickoff.
- Coordinate rideshare pickup zones when transit is disrupted.
- Transit delay plus rain requires additional front-of-house staffing.
- Public route guidance should be reviewed before sending.`
  },
  {
    filename: "hotel_guest_advisory_policy.md",
    metadata: { operatorType: "hotel", category: "guest_advisory" },
    text: `# Hotel Guest Advisory Policy

- Guests should receive match-day transit and weather guidance.
- Prepare lobby signage for venue directions.
- Rain or heat requires safety guidance.
- Provide alternate routes to the venue.
- Escalate guest safety concerns to duty manager.`
  },
  {
    filename: "high_demand_staffing_policy.md",
    metadata: { category: "staffing" },
    text: `# High Demand Staffing Policy

- High-demand teams require added staff.
- If memory shows previous demand spike, use the upper end of staffing range.
- High-profile match within 3 hours requires immediate prep.
- If previous incident involved pickup congestion, create separate pickup staging.
- If expected demand is very high, assign one person to queue management.`
  }
];
