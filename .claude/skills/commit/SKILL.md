---
name: commit
description: >
  Git commit workflow skill for the CNCChoco project. This skill should be used
  whenever the user asks to commit changes to the repository. It enforces
  Conventional Commits formatting, logical change segregation, and a mandatory
  pre-commit checklist before any commit is created.
---

# Commit Skill

## Purpose

To produce clean, readable, well-scoped git commits that are easy to parse
in code review and git history. Every commit request must follow this workflow
in full — no steps may be skipped unless explicitly instructed by the user.

---

## Step 1 — Survey the working tree

Run these commands in parallel:

```bash
git status
git diff
git diff --cached
```

Read the full diff carefully. Understand **what changed and why** before
proceeding. Do not write a commit message until the diff has been reviewed.

---

## Step 2 — Check for pre-commit blockers

Scan the staged and unstaged changes for the following. If any are found,
flag them to the user and resolve before committing:

| Check | What to look for |
|---|---|
| Debug code | `console.log`, `debugger`, `TODO`, `FIXME`, `HACK` left in production paths |
| Secrets / env files | `.env`, `*.key`, `*.pem`, `credentials*`, `secrets*` staged or touched |
| Syntax / startup | Verify the server can still start: `node --check cncserver.js` (fast syntax check) |
| Accidental bulk adds | Ensure `node_modules/`, `*.db`, `*.db-wal`, `*.db-shm` are not staged |

If a blocker is found, stop and report it. Do not proceed until the user
confirms the issue is resolved or intentionally accepted.

---

## Step 3 — Segregate changes into logical commits

Examine the diff for changes that serve **different purposes**. Split into
separate commits when changes fall into clearly different categories. Use
judgment — do not split what belongs together.

**Split when changes are:**
- Different in type and unrelated in purpose (e.g. a bug fix + a new feature)
- Touching different subsystems for different reasons (e.g. API change + UI update that are independent)
- Mix of functional change and documentation/config update with no coupling

**Keep together when:**
- A feature spans multiple files but is one cohesive unit of work
- A fix requires touching both the implementation and its test/config
- Changes are tightly coupled and would be meaningless or broken in isolation

For each logical group, stage only those files, then proceed through
Steps 4–5 before moving to the next group.

---

## Step 4 — Build the commit message interactively

Each of the 6 substeps below requires a suggestion followed by explicit user
approval before proceeding. Present the suggestion clearly, then **pause and
wait**. Do not advance to the next substep until the user confirms or amends.

---

### 4.1 — Review staged changes

Run `git diff --staged` and display the output. Write a brief plain-English
summary of what files changed and what the changes do. Ask the user to confirm
this summary is accurate before continuing.

> "Here's what's staged: [summary]. Does this look right before we build
> the commit message?"

**Wait for approval.**

---

### 4.2 — Identify commit type

Based on the staged diff, propose a Conventional Commits type with a one-line
rationale. Ask the user to confirm or change it.

| Type | Use for |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Tooling, dependencies, config, build changes |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no logic change |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |

> "Suggested type: `fix` — this corrects incorrect behaviour in the engine.
> Agree, or would you like a different type?"

**Wait for approval.**

---

### 4.3 — Determine scope

Propose a scope from the list below based on the primary subsystem touched.
Scope is optional but strongly encouraged. Ask the user to confirm or change it.

Valid scopes: `api`, `engine`, `gcode`, `db`, `config`, `fiori`, `ui`,
`calibrate`, `stats`, `font`, `swagger`, `deps`

> "Suggested scope: `engine` — the changes are isolated to engine.js.
> Agree, or would you like a different scope (or none)?"

**Wait for approval.**

---

### 4.4 — Write the subject line

Propose a subject line following these rules:
- Max **50 characters** (hard limit — count carefully)
- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removes"
- No trailing period
- Lowercase after the colon

Show the full first line as it will appear, with a character count:

> "Suggested subject (43 chars):
> `fix(engine): prevent double-print on active job`
> Approve, or suggest a revision?"

**Wait for approval.**

---

### 4.5 — Write the commit body

Draft a body paragraph explaining **why** the change was made and what impact
it has. Do not just restate the subject line. Rules:
- One blank line between subject and body
- Wrap at ~72 characters per line
- Explain the problem being solved, not just the solution
- Keep it human-readable for future reviewers

Present the full draft body and ask for approval or amendments:

> "Suggested body:
> [draft body text]
> Approve, or would you like any changes?"

**Wait for approval.**

---

### 4.6 — Note breaking changes

Assess whether the changes break any existing API contracts, configuration
keys, job status values, serial protocol behaviour, or Fiori model bindings.

If a breaking change exists, propose a `BREAKING CHANGE:` footer:

```
BREAKING CHANGE: <what broke and what callers must do differently>
```

If no breaking change exists, state that clearly and confirm with the user.

> "No breaking changes detected — existing API consumers and the Fiori app
> are unaffected. Confirm, or is there a breaking change to note?"

**Wait for approval.**

---

### Assembled message

Once all 6 substeps are approved, display the complete commit message in full
for a final review before any git command is run:

```
<type>(<scope>): <subject>

<body>

[BREAKING CHANGE: <note>  ← only if applicable]
```

> "Here is the full commit message. Ready to commit?"

**Wait for final approval before proceeding to Step 5.**

---

## Step 5 — Create the commit

Use a heredoc to preserve formatting exactly:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>
EOF
)"
```

After the commit, run `git status` to confirm success and a clean tree
(or remaining unstaged changes for subsequent commits).

---

## Step 6 — Handle multiple logical groups

If Step 3 identified multiple logical groups, repeat Steps 4–5 for each
remaining group in order from most foundational to most surface-level
(e.g. backend before frontend, core logic before docs).

---

## Constraints

- Never use `git add -A` or `git add .` without reviewing what will be staged
- Never use `--no-verify` or `--amend` on published commits unless explicitly requested
- Never push to remote unless the user explicitly asks
- Never commit `.env`, `*.db`, `*.db-wal`, `*.db-shm`, or `node_modules/`
