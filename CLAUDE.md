# CLAUDE.md

Guidance for Claude Code when working in this repository.
Technical reference (stack, file structure, API endpoints, config keys): [@ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Project Overview

CNC Chocolate Engraver — a Node.js/Express server that drives a GRBL-controlled CNC router to engrave personalised messages on chocolate bars. Features a job queue, web-based management interface, statistics dashboard, and configurable text templates.

### Purpose

The project serves two overlapping goals:

**1. Conference and event demo piece**
A tangible, end-to-end demonstration of a combined hardware/software stack for use at conferences and marketing events. Visitors submit a personalised message, watch it engraved in real time, and leave with the chocolate. The experience is designed to be immediately understandable and memorable — the hardware makes the software visible.

**2. SAP technology showcase**
The team's core practice is SAP. The project is intentionally built to incorporate SAP tooling — currently SAP BTP and SAP Cloud Connector — and should be treated as a platform for demonstrating SAP capabilities in a tangible context. When evaluating new features or architectural changes, consider whether there is a natural opportunity to bring in additional SAP stack components (e.g. SAP Integration Suite, SAP Build, CAP, SAP Event Mesh). These opportunities should be surfaced and discussed rather than defaulted away from.

### Design Constraints

- The system runs on-premise (local machine at an event booth), not as a hosted cloud service.
- Reliability and recoverability matter more than scalability — a crashed machine at a live event is a visible failure.
- The UI must be operable by non-technical staff running the booth.

## Commands

```bash
npm install     # Install dependencies (including sqlite3)
npm start       # Run the main server (cncserver.js)
```

---

## Working Guidelines

### Development Workflow

**Every change follows this four-step cycle — in order, without skipping steps:**

```
1. Document  →  2. Build  →  3. Test  →  4. Verify
```

| Step | What it means |
|------|--------------|
| **1. Document** | Write or update the relevant documentation *before* writing any code. If the change isn't reflected in the spec, API docs, README, or ARCHITECTURE.md, it isn't ready to build. |
| **2. Build** | Code to match exactly what was documented. The documentation is the contract — not the other way around. |
| **3. Test** | Verify the code works and matches the documentation. Test unhappy paths, not just the happy path. |
| **4. Verify** | Confirm the documentation still accurately reflects the final implementation. Correct any drift before closing the work. |

> Code that precedes documentation accumulates ambiguity and debt. Steps 1 and 4 are not optional.

---

### Root Cause

- Never apply quick fixes, patches, or workarounds unless the user explicitly requests one.
- Always diagnose to the root cause before proposing a solution.
- Fix hacky code immediately, or create a tracked issue with a deadline — "fix later" never happens.
- Don't skip fundamentals or best practices just because the code compiles and runs.

---

### Security & Secrets

- Never hardcode secrets or credentials — use environment variables.
- Validate all input server-side — never trust client data.
- Set CORS to specific allowed origins — never `*`.
- Rate limit write operations (guiding principle for this deployment context).

---

### Architecture & Code Quality

- Design architecture before building, if potential conflicts occur with the stated intent of the project, consult the user for further clarification
- Architectural changes require manual review before implementation. Present options starting with the fuller/more complex approach, then walk through with the user which areas can be simplified and what the downstream effects of each decision are.
- Break up large controllers/components early — don't wait for them to become unmanageable.
- Wrap external service calls (serial port, SQLite, GRBL) in a clean service layer.
- Version database schema changes through migration scripts.
- Use real feature flags, not commented-out code.

---

### Observability

- Log all errors persistently to `server.log` — not just to the console.
- Every service exposes a `/health` endpoint for uptime monitoring and SAP Cloud Connector verification.

---

### Documentation

- Update documentation as part of the same logical change — not after the fact, especially for larger changes.
- Keep `README.md`, `ARCHITECTURE.md`, `swagger.js`, and `docs/CNC_Chocolate_Engraver_Specification.html` in sync with each other and with the running code.
- Document how to run, build, and deploy the project.

---

### Testing & Resilience

- Test framework to be selected when the first tests are written — document the intent now.
- Test unhappy paths: network failures, unexpected API responses, malformed G-code, lost serial connection, concurrent print requests.
- Don't assume the happy path is sufficient.

---

### Time Handling

- Store all timestamps in UTC.
- Convert to local time only at the display layer.
