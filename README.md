# CrowdOps AI

An iMessage-native operations copilot for World Cup match days.

Track: Primary: MVP Speed-Run

## Problem
Major live events create operational chaos for businesses and venue teams. Operators must react to match timing, weather, transit, local news, and internal policies manually.

## Solution
CrowdOps lets operators text an agent from iMessage and receive a grounded operational plan.

## Architecture
```txt
iMessage Operator
   ↓
Photon Spectrum
   ↓
CrowdOps Agent
   ├── Butterbase DB + RAG policies
   ├── Evermind long-term memory
   ├── Open-Meteo weather
   ├── GDELT news/event risk
   ├── GTFS optional transit alerts
   └── Nebius inference
   ↓
Risk plan + approval
   ↓
Butterbase audit log + Evermind learned memory
```

## Sponsor Usage
- Butterbase: database, RAG, audit logs, action state.
- Evermind: long-term operational memory.
- Nebius: risk intelligence and structured plan generation.
- Photon: iMessage-native agent interface.

## Setup
1. Copy `.env.example` to `.env.local` and configure all mandatory vendor variables.
2. Install dependencies with `npm install`.
3. Verify Butterbase with `npm run setup:butterbase`.
4. Seed Butterbase cities and matches with `npm run seed:butterbase`.
5. Seed Butterbase RAG policies with `npm run seed:butterbase-rag`.
6. Seed Evermind memories with `npm run seed:evermind`.
7. Run `npm run check:vendors`.
8. Start the web app with `npm run dev`.
9. Start the iMessage worker with `npm run dev:photon`.

## Demo Script
```txt
1. Open CrowdOps Live Command View.
2. Confirm vendor status:
   Butterbase, Evermind, Nebius, Photon.
3. Open iMessage.
4. Send:
   “Analyze Brazil vs Morocco for my sports bar.”
5. CrowdOps receives the message through Photon.
6. CrowdOps collects weather/news/transit signals.
7. CrowdOps retrieves policy docs from Butterbase RAG.
8. CrowdOps retrieves similar memories from Evermind.
9. Nebius generates the risk plan.
10. CrowdOps replies in iMessage:
    HIGH 82/100 with recommended actions.
11. Reply:
    “approve all”
12. CrowdOps updates Butterbase actions and audit logs.
13. CrowdOps writes a learned memory to Evermind.
14. Dashboard shows the whole flow in one view.
15. End with:
    “The next match day starts smarter.”
```

## Troubleshooting
- Butterbase setup failures: confirm `BUTTERBASE_BASE_URL`, `BUTTERBASE_APP_ID`, and `BUTTERBASE_SERVICE_KEY`; create the required tables if your Butterbase app does not auto-create schemas.
- Evermind memory failures: confirm `EVERMIND_BASE_URL`, `EVERMIND_API_KEY`, and `EVERMIND_USER_ID`; run `npm run seed:evermind` after connectivity is fixed.
- Nebius JSON parse failures: confirm `NEBIUS_MODEL` supports chat completions and JSON response format through the configured Nebius base URL.
- Photon/iMessage connection failures: confirm `PHOTON_PROJECT_ID`, `PHOTON_PROJECT_SECRET`, iMessage provider setup, and run `npm run dev:photon`.

## Roadmap
- Support more host cities.
- Add real venue geofencing.
- Add WhatsApp/Slack support through Photon.
- Automate customer advisories.
- Support multi-operator collaboration.
- Add live GTFS feeds per city.
- Build the post-event learning loop.
