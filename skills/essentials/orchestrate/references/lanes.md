# Lane Contracts

Use only the selected lane. The `factory` lane runs all applicable lanes in the
order shown here.

## Plan

Turn a request or tracker scope into an approved, executable source of truth.

1. Inspect the current product, code, tracker, docs, and runtime evidence before
   proposing change.
2. For visible products, capture initial screenshots and state evidence for the
   affected routes, screens, viewports, themes, and device classes. Record what
   is current behavior and what is a target reference.
3. Resolve ambiguity at the correct seam:
   - use Wayfinder for a large effort with unresolved decisions;
   - use Triage for a raw or underspecified issue;
   - use domain modeling for terms and durable domain decisions;
   - use focused research for facts outside the repository.
4. Produce acceptance criteria, dependencies, write boundaries, test and QA
   strategy, documentation obligations, rollout risks, and authority gates.
5. Do not edit implementation files. Finish when the plan or tickets are
   implementation-ready and user decisions are recorded.

## Implement

Implement approved, ready work. Do not reopen settled intent without evidence
of a contradiction.

1. Select the unblocked frontier and claim tracker items before writes.
2. Establish shared foundations first. Then group independent items into safe
   waves.
3. Use test-driven development where it fits the repository and acceptance
   seam. Run focused tests during work.
4. After a frontend surface becomes coherent, run a focused visual pass against
   the plan baseline or design reference. Correct material mismatch before the
   broader review.
5. Integrate each wave and record current test evidence. Do not close items yet
   if review or QA remains.

Finish when the integrated implementation satisfies its acceptance criteria and
is ready for independent review.

## Review

Review a frozen artifact or a diff from a resolved fixed point. Stay read-only.

1. Resolve the specification, repository standards, comparison point, and
   current integrated evidence.
2. Use independent review axes when they are material, such as specification,
   standards, correctness, regression, security, and test adequacy. Avoid
   duplicate axes.
3. For visible work, perform a full affected-surface pass. Compare current
   captures with an approved baseline, design reference, or separately rendered
   fixed point. Check both intended changes and unexpected visual drift.
4. Report findings only. Give each finding a severity, evidence locator,
   consequence, expected correction, and verification method.
5. Separate code findings from environment, data, or tooling blockers.

Finish with no findings or a concrete fix set. Do not mutate the reviewed
artifact.

## Fix

Apply validated findings without reopening the full implementation scope.

1. Recheck each finding against current code and evidence. Reject stale or
   invalid findings with proof.
2. Assign a narrow write owner and exact permitted surface for each accepted
   set.
3. Reproduce the defect or failed evidence before the fix when feasible.
4. Make the smallest complete correction and add or update regression coverage.
5. Repeat the implementation visual check for affected UI. Then rerun the exact
   failed review or QA seam.
6. Return every finding as `fixed`, `rejected`, or `blocked`, with evidence.

Finish when all material findings have a disposition and accepted fixes are
integrated and verified.

## QA

Prove user-visible behavior on the real applicable surface. QA does not replace
unit, integration, or review evidence.

1. Define an evidence matrix of required journeys, environments, devices,
   accounts, data, and expected results.
2. Preflight the runtime and control adapter. Confirm that the tested app or
   page comes from the intended checkout, build, backend, user, and device.
3. Run the journeys through the actual UI. Capture state before and after each
   material transition. Include console, network, logs, accessibility, or data
   evidence when the claim requires it.
4. Classify every row as `PASS`, `FAIL`, `BLOCKED`, or `SKIPPED`. Never convert
   unavailable device evidence into a pass.
5. Route product failures to the `fix` lane. After each fix, rerun the failed
   row and the nearby regression rows.
6. Restore or report changed runtime, account, fixture, and device state.

Finish when the matrix has no unexplained row and the required acceptance gate
passes.

## Factory

Run a tracker-aware delivery loop:

```text
plan -> implement -> review -> fix -> qa -> close
                         ^       |     |
                         +-------+     |
                                 +-----+
```

Review findings return to `fix`, then to the affected review seam. QA failures
return to `fix`, then to the failed QA row and its nearby regression rows.

1. Normalize the source and determine whether planning is already complete.
2. Run `plan` only for unresolved or unready scope. Preserve approved plans and
   resolved decisions.
3. Schedule `implement` by dependency and write-conflict waves.
4. Run `review` after each material integration boundary or coherent milestone,
   not after every mechanical edit.
5. Run `fix` for validated findings, then re-review the affected seam.
6. Run `qa` for each applicable runtime or visible acceptance gate. Route
   failures back to `fix` until they pass or become a real blocker.
7. Reconcile tracker status, docs, domain terms, ADRs, and evidence after the
   integrated result is final.

The factory can skip an inapplicable lane only with a recorded reason. It must
not skip a lane because its evidence is difficult to obtain.
