# complete-ticket Escalation Policy

When in doubt: ask. The cost of a question is low. The cost of building the wrong thing is high.

## Always Escalate (stop and ask Sarah)

| Situation | Why |
|---|---|
| Issue number is ambiguous or next-task returns multiple candidates | Wrong ticket = wasted work |
| Plan critic returns `VERDICT: BLOCK` | Plan cannot proceed as written |
| Plan critic returns `VERDICT: CONCERNS-SCOPE` | Scope creep discovered before implementation |
| Plan introduces a schema change not mentioned in the issue | Data safety risk; needs deliberate approval |
| Plan touches files clearly outside the issue's scope | Scope creep; pause before building |
| Any post-implementation critic returns `VERDICT: BLOCK` | Serious issue that requires human judgment |
| Any post-implementation critic returns `VERDICT: CONCERNS` on second pass | Autonomous fix loop failed; human needed |
| CI fails after one fix attempt | Root cause unclear; don't guess |
| Critic subagent fails to return (crash / timeout) | null result = unknown risk |

## Proceed Autonomously

| Situation | Action |
|---|---|
| Plan critic returns `VERDICT: PASS` | Proceed to human checkpoint |
| Plan critic returns `VERDICT: CONCERNS-MINOR` | Log concerns to `plan_critic_concerns` in state file; proceed to human checkpoint |
| Post-implementation critic returns `VERDICT: CONCERNS` (first time) | Apply fixes; re-run only that critic |
| Re-run critic returns `VERDICT: PASS` | Proceed |
| PR is still in draft at wrap-up | Mark ready automatically with `gh pr ready <NUMBER>` |

## Human Checkpoints

There is exactly one mandatory human checkpoint: **plan approval**.

Sarah must explicitly approve the plan before implementation begins — even if the plan critic returned PASS. This is the only moment where Sarah reviews the implementation strategy. Everything before and after is autonomous unless an escalation condition is met.

If an escalation caused Sarah to weigh in before the checkpoint (e.g., plan critic returned BLOCK and Sarah revised the plan), her resolution serves as plan approval — no separate confirmation needed.

## Critic Re-run Rules

- Re-run only the critic(s) that returned CONCERNS — not all four
- Maximum one re-run per critic per ticket
- If re-run returns CONCERNS again → escalate (see above)
- If re-run returns PASS → proceed
