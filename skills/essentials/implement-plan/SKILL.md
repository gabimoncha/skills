---
name: implement-plan
description: Orchestrate implementation of an approved plan
disable-model-invocation: true
---

Use this when the user is ready to implement an approved plan. The plan may be
pasted from another session, written in a plan file, or present earlier in the
current conversation after a planning exchange. Treat the approved plan as the
source of user intent, then orchestrate the work through a worker-review-fix
loop.

## Plan Source

Resolve the plan before implementation:

- If the prompt includes a pasted plan, use it.
- If the user invokes this after planning in the same conversation, use the
  latest plan the user accepted or asked to continue from.
- If the prompt names a plan file, read that file and any local planning
  instructions before editing.
- If several plausible plans exist and the intended one is unclear, ask the
  smallest blocking question before spawning workers.

Completion criterion: you can identify the exact plan source and summarize the
accepted scope in your own words.

## Loop

1. Ground the task before delegation.
   - Read the resolved plan, the relevant project instructions, and the files
     the plan names before editing.
   - Capture the starting state with `git status --short` and preserve unrelated
     dirty work.
   - Turn the plan into a short checklist with acceptance criteria and likely
     verification commands.
     Completion criterion: you can state the intended diff, the files or modules
     likely to change, the acceptance criteria, and any blockers.

2. Spawn the implementation worker.
   - Use the repository's clear implementation lane when overrides are
     available.
   - Give the worker the plan, acceptance criteria, relevant constraints, and
     explicit ownership of the implementation write scope.
   - Tell the worker it is not alone in the codebase: it must preserve unrelated
     dirty state, adapt to existing edits, implement directly in its workspace,
     run focused verification, and report changed files plus verification
     results.
     Completion criterion: the worker returns either implemented changes with
     verification results or a concrete blocker that the main agent cannot resolve
     from code or docs.

3. Integrate and verify the worker result.
   - Review the returned files and diff locally before continuing.
   - Run focused verification yourself when feasible. Fix trivial integration
     issues locally only when they are clearly mechanical; keep substantive
     fixes for the fix worker after review.
     Completion criterion: the main workspace contains the intended worker changes
     and you have a current diff plus verification state for the review pass.

4. Spawn the review pass.
   - Use a fresh subagent on the repository's judgment lane when overrides are
     available.
   - Make this pass read-only by instruction. It reviews the current diff
     against the plan, acceptance criteria, project instructions, and test
     evidence.
   - Ask for findings only: correctness bugs, missed acceptance criteria,
     behavioral regressions, unsafe scope creep, and meaningful missing tests.
     Require file and line references where possible. If there are no findings,
     it must say so plainly.
     Completion criterion: the review returns either no findings or a concrete,
     actionable fix list.

5. Spawn the targeted fix worker when review finds issues.
   - Use a second worker on the clear implementation lane.
   - Give it only the review findings, the original acceptance criteria, and the
     exact files or modules it may touch.
   - It should implement confirmed fixes and missed acceptance criteria, then
     rerun the focused verification relevant to those fixes.
     Completion criterion: every review finding is fixed, explicitly declined as
     invalid with evidence, or blocked by a reason the main agent cannot resolve.

6. Finish in the main session.
   - Re-read the final diff against the original starting state.
   - Run the strongest focused verification that fits the change, and include
     any skipped verification with the reason.
   - Do not commit unless the pasted plan or user explicitly asked for it.
     Completion criterion: final response includes what changed, verification
     status, unresolved risks or blockers, and any review findings that were fixed
     or rejected.

If subagent tooling or model overrides are unavailable, run the same loop in the
main session and say which delegation step was unavailable.
