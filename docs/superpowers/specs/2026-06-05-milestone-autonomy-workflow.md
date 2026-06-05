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

### Phase 3 — Acceptance & iterate (human + Claude, at the milestone boundary)

When the pipeline **STOPs** at "milestone N complete," the milestone is *code-complete*, not *done*. Phase 3 is the human loop that sits between that stop and approving N+1:

1. **You test** the milestone hands-on.
2. **File feedback** as a single GitHub issue — typically a checkbox dump of bugs, polish, and open questions (cf. #156, the Focus milestone's end-of-milestone feedback: nine fixes plus design questions in one issue).
3. **Triage at breakdown, not execution.** The feedback issue re-enters Phase 1's **breakdown** step — it is *not* handed raw to the implementer. Breakdown splits it three ways:
   - **Deterministic bugs** (missing severity 0, save button hidden under the nav, keyboard covers the input) — a correct answer exists, no product judgment → technical tasks in the DAG → full loop, mostly auto-mergeable.
   - **Design decisions dressed as feedback** ("…open to other solutions", "Option A or Option B") — underspecified by design → resolved *with you* as user stories / a short design chat **before** breakdown, not discovered mid-pipeline.
   - **Out of scope / not now** (depends on unbuilt work, e.g. #156's Routines item) → deferred and filed elsewhere.
4. **Pipeline iterates** the resulting bug tasks (Phase 2).
5. **You close the milestone**, then approve N+1 (flip `draft → approved` in the DAG).

**The load-bearing idea: feedback re-enters at definition, not execution.** The breakdown step is the triage gate that keeps the autonomous loop pointed only at items with a correct answer. The mid-pipeline escalation is the *safety net* for a design-flavored item that slips the triage — not the primary path. (Whether end-of-milestone polish is best done as one batched "fixups" task or atomized per-bug is an [open question](#open-questions-resolve-during-implementation-breakdown).)

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

## Migration & rollout (test before delete)

This redesign ships as a **staged migration**, not a cutover. `complete-ticket` (the CLI orchestrator) stays canonical and available as a fallback until the pipeline is proven.

**Stage 0 — today.** CLI `complete-ticket` as-is. Baseline.

**Stage 1 — Trial pipeline, auto-merge OFF.** The GitHub Action runs the full agent chain on a fresh checkout, opens a PR, and **stops without merging** — the auto-merge gate in [Merge policy](#merge-policy-data-safety-aware-auto-merge) sits behind a flag that is **OFF** in this stage. You review every PR by hand (as today, minus the per-ticket plan checkpoint). Scope: **one trial milestone, pipeline-only** — the CLI is not run against the same milestone, so two walkers can't grab the same "next unblocked." What Stage 1 actually trials: fresh-checkout context re-derivation, the quality of *planless-but-critiqued* output, and the escalation → stop → resume cycle. Exit criteria ("if tokens allow it and the process works"): cost-per-ticket acceptable, output quality matches the CLI flow, escalation/resume verified.

**Stage 2 — Full autonomy, auto-merge ON.** Flip the auto-merge flag on (the data-safety escalation still always gates schema changes). *Only now* delete the `complete-ticket` orchestrator skill and drop `next-task` from the pipeline path.

**Reused vs replaced.** The pipeline **reuses the agents unchanged** — `haven-technical-planner`, `haven-implementer`, the four critics, `/simplify`, `/code-review`. What's replaced is narrow: the `complete-ticket` *orchestrator glue* (→ a workflow file) and `next-task` *in-pipeline* (→ the deterministic DAG resolver; `next-task` is retained for interactive use). Deletion is ultimately one skill file, and it comes **last** — only after Stage 1 earns the trust.

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
- **Within-run vs across-run ticket chaining, and batching** — does one Action run do a single ticket (re-triggered on merge) or loop until the milestone is done? Token/time bounds favour one-per-run; decide explicitly. **Relatedly:** end-of-milestone polish (cf. #156 — nine fixes in one human-authored PR) is far cheaper as a single "milestone-N fixups" task than atomized into one PR per bug, which multiplies plan/critic/CI overhead. Decide whether the DAG needs a multi-item task notion and whether batching or atomization is the default for fixup bundles.
- **Auto-merge mechanics** — merge method, branch-protection interaction, who holds the merge token.
- **Re-trigger plumbing** — exact event filter that resumes a `blocked-on-human` ticket from a comment reply.

---

## Out of scope for this spec

- #170 Part 1 (review/critics consolidation), Part 2 (concise critic messages), and the non-plan-critic model assignments — **independently shippable**, do not wait on this redesign.
- The implementation breakdown itself (skills/agents/CI to create or modify) — done once this design is approved, tracked under the **#170 umbrella (no separate epic)**.
