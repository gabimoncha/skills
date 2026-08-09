---
name: orchestrate
description: Coordinate software work through an explicitly selected plan, implement, review, fix, qa, or factory lane. Use when the user invokes $orchestrate with a lane and wants one parent agent to select companion skills and evidence sources, schedule safe parallel or serial work, preserve tracker and repository state, and own integration and completion.
---

# Orchestrate

Act as the parent control plane. Keep the user intent, source of truth,
integration state, and final result in the parent. Delegate bounded work only
when it has a clear owner and result.

## Select the lane

Require exactly one lane:

```text
$orchestrate plan <request or tracker source>
$orchestrate implement <approved plan or ready work>
$orchestrate review <artifact, diff, or fixed point>
$orchestrate fix <validated findings>
$orchestrate qa <surface and journeys>
$orchestrate factory <request, plan, or tracker source>
```

If the lane is missing or unclear, ask one short blocking question. Do not
silently change lanes. Read [Lane Contracts](references/lanes.md) for the
selected lane. The `factory` lane reads all lane contracts and runs their gates
in order.

Load these references only when they apply:

| Condition | Reference |
| --- | --- |
| The source contains several tickets, a plan bundle, or tracker hierarchy | [Work Graph And Tracking](references/work-graph-and-tracking.md) |
| The task has a web, mobile, desktop, or device-visible surface | [Visual And Device Evidence](references/visual-and-device-evidence.md) |
| The prompt or repository names another skill, or a specialist skill materially changes a lane | [Companion Skills](references/companion-skills.md) |

## Establish the contract

Before delegation or edits:

1. Resolve the exact request, lane, source, repository instructions, and
   authority limits.
2. Read the relevant plan, tickets, code, domain docs, ADRs, and current test or
   QA evidence. Treat tracker state as an index, not proof that work is correct.
3. Capture the starting repository state and preserve unrelated changes.
4. State the outcome, acceptance criteria, in-scope surfaces, excluded work,
   evidence gates, and actions that still require user authority.
5. For a UI surface, capture the lane-specific visual baseline described in
   the visual evidence reference before a change makes that baseline hard to
   recover.

Do not turn an unresolved decision into an implementation assumption. Route it
to a planning or triage companion, or pause when a human decision is required.

## Build the execution ledger

Maintain a compact internal ledger with:

- work item and owner;
- dependency and write-conflict edges;
- current state and acceptance criteria;
- required tests, review, visual checks, and QA;
- documentation, domain model, ADR, and tracker obligations;
- findings and their disposition;
- blockers and authority gates.

Use explicit tracker dependencies first. Also inspect shared files, modules,
schemas, migrations, public contracts, generators, fixtures, runtime resources,
and docs before declaring work independent.

## Coordinate work

1. Keep synthesis, scope decisions, shared foundations, integration, tracker
   truth, and terminal completion in the parent.
2. Use a model-routing skill or repository routing policy before delegation
   when one is available or required.
3. Give each worker a bounded outcome, exact inputs, write scope, constraints,
   verification, and stop condition. Give one write surface to one owner at a
   time.
4. Use disposable subagents for finite work that returns to the parent. Create
   a durable user-visible task only when the user explicitly asks for one and
   the branch has independent continuation value.
5. Run work in parallel only when dependency and write-conflict graphs both
   permit it. Use isolated worktrees or another repository-approved isolation
   method for concurrent writers. Serialize shared contracts and integrations.
6. Use fresh read-only reviewers. Do not let a maker approve its own work.
7. Integrate results in dependency order. Re-read the actual diff and rerun the
   relevant evidence gate after each integration wave.
8. Preserve user pauses and external authority gates. Do not hide them inside
   a delegated task.

Do not create debate for routine implementation. Use an adversarial council
only when the user invokes it or when an explicit project rule requires it.
Keep council critics read-only and keep the write owner outside the council.

If delegation is unavailable, run the same lane in the parent and report the
missing delegation step. Do not weaken acceptance criteria.

## Prove and close

Use the strongest proportionate evidence. A command exit code, screenshot,
review report, or tracker status is only evidence for the claim it directly
supports.

Do not mark a work item complete until:

- its accepted scope is present in the integrated result;
- required focused tests pass;
- review findings are fixed, rejected with evidence, or recorded as blocked;
- required runtime or visual QA passes, or has an explicit `BLOCKED` or
  `SKIPPED` reason;
- affected docs, domain terms, ADRs, and tracker records match the result;
- unrelated starting state remains preserved.

Return the outcome first. Then report integrated work, verification, visual or
device evidence, finding dispositions, tracker or documentation updates, and
remaining blockers. The parent alone declares the lane complete.
