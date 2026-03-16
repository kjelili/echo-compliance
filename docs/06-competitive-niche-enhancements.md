# Competitive Niche Enhancements

## Goal
Introduce differentiated capabilities that move Echo Compliance beyond standard daily-log tooling.

## Implemented in this iteration

### 1) Compliance Pulse Score (new niche)
- What it does:
  - Produces a site-level readiness score (`0-100`) and grade (`A-E`).
  - Converts action pressure + risk trend + evidence quality into one leadership signal.
- Why it stands out:
  - Most competitors show raw counts; this adds a predictive readiness indicator for shift planning.
- Implemented components:
  - Backend analytics engine in `backend/src/server.js`.
  - API endpoint: `GET /api/sites/:siteName/compliance-pulse`.
  - Frontend panel: `frontend/src/components/CompliancePulsePanel.jsx`.

### 2) 48-hour SLA Breach Forecast (new niche)
- What it does:
  - Flags open actions due within 48 hours before they become overdue.
  - Prioritizes preventive intervention over retrospective reporting.
- Why it stands out:
  - Helps site leads avoid SLA misses proactively.
- Implemented components:
  - Metric `dueIn48Hours` in the Compliance Pulse response.
  - UI metric card in Compliance Pulse panel.

### 3) Evidence Gap Radar (new niche)
- What it does:
  - Highlights high-priority logs that are missing photo evidence.
  - Surfaces "attention zones" inferred from repeated risks and open action language.
- Why it stands out:
  - Improves audit readiness and quality of closure evidence.
- Implemented components:
  - Metric `evidenceGapHighPriority`.
  - `attentionZones` analysis in backend pulse output.
  - Frontend chips and recommendations in Compliance Pulse panel.

## Documentation used for implementation
- Product + architecture baseline:
  - `README.md`
  - `docs/01-requirements-review.md`
- Existing endpoint behavior and payload conventions:
  - `docs/03-api-reference.md`
- Current UX system and reusable styles:
  - `docs/05-ui-ux-system.md`
- Existing quality/stability process:
  - `docs/04-build-verification.md`

## Skills needed to build and operate these enhancements

### Engineering skills
- Node.js/Express endpoint design and validation.
- Aggregation analytics and risk signal design.
- React state orchestration across multiple asynchronous data sources.
- Frontend information design for decision-oriented panels.

### Domain skills
- Construction compliance operations (action closure, escalation, evidence rules).
- Risk trend interpretation for handover and pre-shift planning.
- Audit-readiness criteria (photo evidence and high-priority controls).

## Stability workflow used in this implementation
1. Implement backend analytics and endpoint.
2. Run `npm run test -w backend`.
3. Run `npm run build -w backend`.
4. Implement frontend API wiring + panel.
5. Run `npm run build -w frontend`.
6. Run full workspace build `npm run build`.
7. Confirm no new linter issues in touched files.
