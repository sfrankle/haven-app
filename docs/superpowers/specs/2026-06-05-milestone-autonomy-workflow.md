# Milestone-Autonomy Workflow Design

**Date:** 2026-06-05
**Status:** Proposed — pending Sarah's approval and an implementation breakdown
**Supersedes (in part):** `2026-03-25-autonomous-ticket-workflow-design.md` — see [Relationship to the 2026-03-25 spec](#relationship-to-the-2026-03-25-spec). That spec's agent roster, critic model, and shared-file conventions still hold except where noted here.
**Origin:** GitHub issue #170 (workflow improvements). Parts 1, 2, and the model assignments from #170 ship independently of this redesign.

---

## Motivation

The original autonomous workflow (`complete-ticket`) gates every ticket on a **human plan-approval checkpoint**. In practice Sarah does not read the per-ticket plans, so that gate adds latency without adding scrutiny — it is theatre. As trust in the autonomous flow has grown, the goal is to **re-target human attention** rather than reduce it:

- **Concentrate** human judgment up front, at milestone definition (stories → task breakdown → dependency graph), and at the milestone boundary.
- **Remove** the per-ticket plan checkpoint.
- **Escalate** to the human only on genuine questions, data-safety changes, or blocking critic findings.
- **Never** let Claude start the next milestone without explicit approval.

The aspiration: define a milestone well enough up front that Claude can complete the *entire* milestone — ticket by ticket, in dependency order — without intervention, surfacing only real questions along the way.

This is a deliberate posture shift, not a safety reduction: real safety lives in good up-front definition, the plan-critic, the implementation critics, and the tests — not in a checkpoint nobody reads.

---

## The core change: where the human gate lives

| | Old (`complete-ticket`) | New (milestone autonomy) |
|---|---|---|
| Per-ticket plan approval | **Required, always** | **Removed** |
| Plan quality gate | Human + plan-critic | **Plan-critic alone** (now load-bearing) |
| Human involvement during execution | Every ticket | **Exceptions only** (questions, data-safety, blocking findings) |
| Milestone boundary | Implicit | **Explicit hard stop** — needs approval to advance |
| PR merge | Human merges each | **Data-safety-aware auto-merge** (see below) |
| Ticket state | Local `ticket-in-progress.json` (gitignored) | **Checked-in DAG file** (survives fresh checkouts) |

Because the plan-critic is now the sole automated gate on plan quality before code can auto-merge, **`haven-plan-critic` moves from Sonnet to Opus 4.8.** The human backstop has not disappeared — it has moved up front, to milestone/DAG approval.

---

## Source of truth: hybrid

- **GitHub** remains the human-facing planning and discussion layer: milestones, user stories, and the escalation channel (issue/PR comments).
- **A checked-in DAG file** becomes the machine-facing execution layer: technical tasks, their dependencies, milestone grouping, and status.

This split solves a concrete pipeline problem: a scheduled run does a **fresh checkout**, so execution state cannot live in a local file. A versioned DAG file travels with the code, makes "next unblocked" a pure graph walk (zero Claude, zero API calls), and lets ticket completion be **atomic with the PR that does the work** — the same PR that implements a task flips it to `done`.

### DAG schema (illustrative — finalize during breakdown)

```yaml
# docs/tasks.yml (location TBD)
milestones:
  - id: m2
    title: "..."
    status: approved      # Sarah flips this. The pipeline never touches a non-approved milestone.
  - id: m3
    title: "..."
    status: draft

tasks:
  - id: t-167
    milestone: m2
    title: "Routine queries, hooks, and ScheduleableBlock utility"
    depends_on: []
    status: done
    issue: 167           # optional back-link to the GitHub story/issue
    pr: 167
  - id: t-170
    milestone: m2
    depends_on: [t-167]
    status: todo
```

Task `status`: `todo` → `in-progress` → `done`, plus `blocked-on-human` for an open escalation.

### Next-unblocked resolver (deterministic, no Claude)

The lowest-ordered task where:
1. its `milestone.status == approved`, **and**
2. every id in `depends_on` has `status == done`, **and**
3. its own `status == todo`.

Pure bash + `yq`/`jq`. The Claude `next-task` skill is retained for interactive "what's next?" use but is **not** in the pipeline path — Sarah's milestone curation *is* the prioritization.

---

## Phases

### Phase 1 — Definition (human + Claude, up front)

1. Define the milestone and its user stories in GitHub (as today, via the existing skills).
2. **Breakdown** (`break-down-user-stories`, extended): emit technical tasks **with inferred `depends_on` edges** into the DAG file. Claude proposes the dependency graph; Sarah reviews it.
3. **Sarah approves the milestone** by flipping `status: draft → approved` in the DAG file (a small commit/PR). **This is the primary human gate.**

### Phase 2 — Execution (pipeline, autonomous)

```
TRIGGER (cron or `approved`-label event)
  ↓
PRE-CHECK  (bash only — zero Claude)
  parse DAG → next unblocked task in an `approved` milestone
   ├─ a task is mid-flight / blocked-on-human  → exit (serialize: one ticket at a time)
   ├─ none left in approved milestone          → STOP + notify
   │                                              ("milestone N complete — approve N+1 to continue")
   │                                              never inspects `draft` milestones  ← enforces "don't start next milestone"
   └─ found a task → launch Claude for that ticket
  ↓
PER-TICKET (Claude — the evolved complete-ticket)
  plan (haven-technical-planner, opus)
    → plan summary posted to the GitHub issue (durable; survives fresh checkout)
  plan-critic (haven-plan-critic, OPUS)
    → BLOCK / CONCERNS-SCOPE / genuine ambiguity → ESCALATE (see below)
    → else proceed                          ← no human checkpoint here anymore
  implement (haven-implementer, opus) — TDD
  critics in parallel:
    haven-code-quality-critic (sonnet)
    haven-product-vision-critic (opus)
    haven-safety-critic (sonnet)
  /simplify (orchestrator model)  +  /code-review medium (wrapped: model sonnet)
  synthesize findings → any unresolved BLOCK → ESCALATE
  open PR
  ↓
MERGE DECISION  (bash path check — zero Claude)
  git diff --name-only touches the migrations/schema dir?
   ├─ yes → ESCALATE for human review before merge  (data safety — always)
   └─ no  → all critics PASS + CI green → AUTO-MERGE
  ↓
WRAP-UP
  flip task → done in the DAG file (in the merging PR)
  merge event re-triggers PRE-CHECK → next unblocked task
```

---

## Merge policy: data-safety-aware auto-merge

True milestone autonomy requires auto-merge — if Sarah merges each PR by hand, that is a per-ticket touch point and the milestone is not intervention-free.

- **Non-schema tickets:** all critics `PASS` + CI green → **auto-merge**.
- **Schema / migration tickets:** **always escalate** to Sarah for review before merge.

Critically, the schema gate is a **path check, not a critic verdict**: a correct migration with its integrity test *passes* `haven-safety-critic`, so the verdict cannot distinguish it. The gate is `git diff --name-only` hitting the migrations/schema directory — bash-only, deterministic. This matches Haven's actual risk model: a UI ticket flows through; anything that can touch user data gets human eyes.

---

## Escalation model: post → stop → resume-with-answer

Escalation is not "post and forget." It is a three-beat cycle that survives the run ending:

1. **Post** the question as a comment on the relevant GitHub issue/PR (optionally a push notification). Set the task `status: blocked-on-human` in the DAG.
2. **Stop** the run.
3. **Resume:** Sarah answers in the thread. A re-trigger (an `issue_comment` event on the thread, or the next scheduled pre-check) starts a fresh run that **re-derives context from GitHub-durable state** — the issue body, the posted plan summary, and the Q&A thread — then proceeds.

Because per-ticket plans live in `docs/plans/` (gitignored, local), they do **not** survive a fresh checkout. Execution is therefore **stateless across runs**: a resumed run re-plans from the issue + DAG + Q&A. This is a virtue for a pipeline (idempotent, resumable from durable state), at the cost of re-planning tokens on resume.

### Escalation triggers

- Ticket is ambiguous or underspecified.
- Plan-critic returns `BLOCK` or `CONCERNS-SCOPE`.
- **Any schema or migration change** (data safety — always, at the merge gate).
- A decision the ticket does not specify.
- A post-implementation critic returns `BLOCK` that cannot be auto-resolved (after one fix attempt, per existing escalation policy).
- The work reveals the ticket itself was wrong (scope is incoherent).

---

## Trigger architecture: hybrid

- **`schedule:` (e.g. daily)** — drives plan-phase discovery and catch-up.
- **`issues: labeled` / `pull_request` merge event** — fires the next pre-check immediately when Sarah approves a milestone or a PR auto-merges, so progress doesn't wait for the next cron tick.

Both entry points run the same bash pre-check first. A GitHub Actions **concurrency group** enforces one-ticket-in-flight (belt to the DAG's status braces).

This requires widening `claude.yml` permissions from read-only to `contents: write` + `pull-requests: write` (currently it is `@claude`-mention-triggered and read-only). That permission change and the phase-split are the two things the original #170 Part 3 named as blockers.

---

## Model assignments (carried from #170 Part 4, with the plan-critic correction)

| Step | Agent / skill | Model | Note |
|---|---|---|---|
| plan | `haven-technical-planner` | **opus** 4.8 | maker |
| plan-critic | `haven-plan-critic` | **opus** 4.8 | **changed from sonnet** — now the load-bearing plan gate (no human checkpoint) |
| implement | `haven-implementer` | **opus** 4.8 | maker; changed from sonnet (2026-03-25 spec) |
| create-pr | `haven-create-pr` | sonnet 4.6 | changelog voice too easy to fumble on Haiku |
| code-quality-critic | `haven-code-quality-critic` | sonnet 4.6 | diverse from implementer; slimmed scope (#170 Part 1) |
| product-vision-critic | `haven-product-vision-critic` | **opus** 4.8 | exception — nuanced judgment |
| safety-critic | `haven-safety-critic` | sonnet 4.6 | binary, high-stakes |
| `/code-review` | (built-in) | sonnet 4.6 | **wrapped** in a `model: sonnet` Agent dispatch for independence from the Opus implementer; effort `medium` |
| `/simplify`, `next-task` | (built-in / skill) | orchestrator | run in-session; not pinned |
| orchestrator | `complete-ticket` | opus 4.8 (fast mode) | synthesis, glue |

---

## Conscious postures (stated, not relitigated)

- **Auto-merged non-schema code lands with no human eyes**, relying entirely on the critics + CI. This is a deliberate trust posture ("trusting Claude more"), bounded by the data-safety escalation on anything that touches user data.
- **Hybrid source-of-truth can drift**: GitHub stories and the DAG file are separate artifacts. Discipline: the DAG is regenerated/updated *only* by the breakdown step from the approved stories; ad-hoc edits to one without the other are out of bounds. (Mechanism to detect drift is an open question below.)

---

## Relationship to the 2026-03-25 spec

| 2026-03-25 element | Status under this spec |
|---|---|
| Human plan-approval checkpoint | **Removed** |
| `haven-plan-critic` model = opus | Reaffirmed (was opus there, briefly sonnet in #170, back to **opus**) |
| `haven-implementer` model = sonnet | **Changed to opus** |
| Local `ticket-in-progress.json` state | **Replaced** by the checked-in DAG for cross-run state; local file may persist for within-run resume only |
| Four-critic roster, `_shared` files, escalation-policy | **Retained**, extended with the merge-decision gate |
| `next-task` as the selector | **Replaced** in-pipeline by the deterministic DAG resolver; retained for interactive use |
| Hand to Sarah for merge | **Replaced** by data-safety-aware auto-merge |

---

## Open questions (resolve during implementation breakdown)

- **DAG file format and location** — `docs/tasks.yml`? YAML vs JSON? Resolver tool (`yq` vs `jq`).
- **Drift detection** between GitHub stories and the DAG — a CI check that fails if they disagree?
- **Within-run vs across-run ticket chaining** — does one Action run do a single ticket (re-triggered on merge) or loop until the milestone is done? Token/time bounds favour one-per-run; decide explicitly.
- **Auto-merge mechanics** — merge method, branch-protection interaction, who holds the merge token.
- **Re-trigger plumbing** — exact event filter that resumes a `blocked-on-human` ticket from a comment reply.

---

## Out of scope for this spec

- #170 Part 1 (review/critics consolidation), Part 2 (concise critic messages), and the non-plan-critic model assignments — **independently shippable**, do not wait on this redesign.
- The implementation breakdown itself (skills/agents/CI to create or modify) — a follow-up once this design is approved.
