# Work Graph And Tracking

Use this reference for a plan bundle, local tracker, external tracker, or any
scope with several work items.

## Normalize the source

Map every tracker to the same internal record:

```text
id and stable locator
title and accepted scope
parent and children
status and owner
explicit blockers and dependents
acceptance criteria
likely write surfaces
tests, review, visual checks, and QA
docs, domain terms, ADRs, and release obligations
authority gates and external side effects
```

Support at least these source shapes:

- an approved plan in the prompt, conversation, or file;
- local Markdown specs, maps, and issue files;
- a Linear initiative with projects and issues;
- a Linear project with issues;
- a Linear issue with sub-issues.

Use the tracker adapter supplied by repository instructions. For Linear, use an
available authenticated Linear connector. Read current state before any update.
Do not assume that status names, dependency fields, or project hierarchy are
the same across workspaces.

## Route readiness

Classify each item before scheduling:

- `decision`: route to planning or Wayfinder;
- `needs-triage`: route to Triage;
- `ready`: eligible for implementation;
- `active`: already owned; reconcile before assigning;
- `review`: implementation exists but review is open;
- `qa`: code review is complete but runtime proof is open;
- `blocked`: record the exact dependency, authority, or evidence gate;
- `complete`: verify the evidence before trusting the state.

A resolved Wayfinder ticket records a decision. It is not proof that an
implementation ticket is complete.

## Build two graphs

Build a dependency graph from explicit blocker and parent-child relations. Then
build a write-conflict graph from likely ownership of:

- files and modules;
- schemas, migrations, and generated outputs;
- public interfaces and shared types;
- configuration, fixtures, and test infrastructure;
- docs, domain glossary, ADRs, and release metadata;
- shared services, browser sessions, simulators, devices, and test accounts.

Only items with no blocking edge in either graph can run in parallel. If write
scope is uncertain, serialize until a worker proves a safe boundary. Prefer one
serial foundation owner, followed by independent feature workers, followed by
one integration owner.

## Update state with evidence

Use the tracker's native state model. Preserve names and required comments.
Apply these semantic transitions:

1. Claim: assign one owner and record the accepted scope.
2. Implemented: attach changed surfaces and focused test evidence. Do not claim
   completion while review or QA is open.
3. In review: attach the fixed point and review scope.
4. In QA: attach the build, runtime, environment, and evidence matrix.
5. Complete: attach final verification and close only after required docs and
   findings are reconciled.
6. Blocked: state the exact missing dependency, permission, decision, runtime,
   or external input and the next action that can unblock it.

For local Markdown, follow the repository's issue-tracker document for status,
comments, and parent-map changes. For Linear, update issues first and roll up a
project or initiative only when its required children and gates are complete.

## Reconcile durable records

Treat documentation as part of the work item:

- update user or developer docs when the supported behavior or operation
  changes;
- update domain docs when accepted terms or boundaries change;
- add or supersede an ADR only for a durable architectural decision;
- update plans and tickets so their status matches integrated evidence;
- keep rejected scope and follow-up work explicit instead of hiding it in the
  completion report.

Do not create an ADR for routine implementation detail. Do not close a parent
because most children are complete.
