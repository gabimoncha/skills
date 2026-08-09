---
name: orchestrate-goal
description: Orchestrate an explicitly declared long-running Codex goal through bounded delegation and selective durable side tasks. Use only when the user explicitly invokes $orchestrate-goal for a goal and wants the current task to coordinate subagents or Codex side tasks, synthesize their work, continue autonomously while unblocked, and own terminal completion. Do not use for ordinary requests or infer that complexity alone makes a request a goal.
metadata:
  internal: true
---

# Orchestrate Goal

Own the declared goal from initialization through synthesis and terminal completion. Keep the current task as the parent orchestrator.

## Establish the contract

1. Confirm that the user explicitly declared a goal and invoked this skill.
2. Extract:
   - terminal outcome;
   - acceptance criteria;
   - sources and repositories in scope;
   - required skills or tools;
   - authority boundaries;
   - requested naming prefix, if any.
3. Treat explicit user constraints as controlling.
4. Do not broaden permissions, mutate unrelated state, or reinterpret an ordinary request as a goal.
5. If the goal is clear, begin work without requesting redundant confirmation.

## Route before delegating

Invoke `$codex-model-router` before creating any subagent or delegated Codex task. Follow its selected model and reasoning lane.

If a delegated worker may delegate again, instruct it to invoke `$codex-model-router` before doing so.

Do not delegate work merely to appear parallel. Keep synthesis, cross-branch decisions, authority-sensitive actions, and terminal completion in the parent.

## Choose the delegation surface

Use a bounded subagent when the work:

- answers a concrete, independently inspectable question;
- gathers evidence or performs a narrow implementation or review slice;
- can return its result to the parent and then be discarded;
- does not need a durable user-visible continuation point.

Give each subagent a bounded scope, relevant inputs, required output, constraints, and a clear stopping condition.

Create a durable Codex side task only when at least one of these is true:

- an important question remains genuinely open;
- multiple credible variations deserve separate development;
- the branch has independent value the user may want to inspect or continue.

Do not create a durable task for routine research, mechanical work, duplicate validation, or a branch that only feeds the parent’s immediate synthesis.

Treat explicit invocation of this skill as authorization to create qualifying side tasks. Do not create them if the user says to keep all work in the parent task or otherwise restricts task creation.

## Name durable tasks

Use a short, useful title in this form:

```text
<prefix or goal label>: <decision, variation, or continuation topic>
```

Make the distinguishing question or outcome visible in the title. Avoid generic names such as “research,” “worker,” or “task 2.”

Give each side task enough context to work independently:

- the relevant goal slice;
- source locations or evidence;
- expected deliverable;
- constraints and authority boundaries;
- its relationship to the parent;
- instructions to report conclusions without claiming completion of the parent goal.

## Coordinate execution

Maintain a lightweight internal ledger of:

- active work;
- completed evidence;
- open decisions;
- created durable tasks;
- blockers;
- remaining acceptance criteria.

Continue autonomously while safe, in-scope work remains unblocked. Integrate returned results promptly and resolve contradictions with evidence.

Do not make the user coordinate delegates. Do not abandon synthesis to a side task. Do not mark the goal complete because delegates finished, time passed, or most outputs exist.

Pause only when completion requires user authority, a material product decision not granted by the goal, unavailable external input, or another genuine blocker.

## Complete the goal

Before declaring completion:

1. Verify the terminal outcome against the acceptance criteria.
2. Reconcile delegated findings and variations.
3. Distinguish completed work, recommendations, unresolved decisions, and evidence gates.
4. Confirm that required outputs exist and relevant verification passed.
5. Close or accurately report the goal through the available goal mechanism.

In the final response, report:

- the synthesized outcome;
- important deliverables and verification;
- material limitations or unresolved decisions;
- every durable Codex task created, using the product’s required task references or directives;
- the final goal status.

The parent alone owns the final goal outcome.
