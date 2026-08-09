---
name: coordinate-shared-simulator
description: Lease one shared iOS simulator and runtime across existing Codex tasks.
disable-model-invocation: true
---

# Coordinate Shared Simulator

Act as the **control tower** for one host-global simulator. Keep participant tasks in their own checkouts; serialize only the mutable device foreground and any shared runtime transition.

## Inputs and defaults

Accept one or more Codex task IDs plus optional intent:

```text
Mode: observe | handshake | lease
Goal: <bounded simulator observation or QA flow>
Order: listed | <explicit priority>
Coordinator: current | <task-id>
```

- With one supplied ID, coordinate the current task with that task.
- With two or more IDs, use the current task as an external control tower unless the user names a coordinator.
- Deduplicate IDs while preserving listed order.
- Default to `observe` when the user has not explicitly authorized live coordination.
- Treat a conditional future need as `observer`, not as a queued requester.

## 1. Gate capabilities and participants

Discover the current Codex task tools by capability. Prefer the built-in task list, read, and follow-up-message tools (currently `list_threads`, `read_thread`, and `send_message_to_thread`). Use the exposed wrappers instead of opening a raw app-server client.

Read supplied IDs directly with minimal recent history and no command outputs. Use task listing only to resolve a missing host or ID. Record exact ID, host, cwd, status, current phase, and visible device/runtime activity.

Keep every task in its existing checkout and retain its model and reasoning settings. Codex Handoff moves Git state and interrupts a running task; create, fork, interrupt, archive, and Handoff operations are outside this resource-leasing workflow.

If read or message capabilities are absent, fail, or stay unresponsive, produce copyable per-task messages and remain in `observe`. Filesystem rollouts may diagnose identity but cannot acknowledge a lease.

Completion criterion: every supplied ID is classified as reachable participant, observer, or unresolved; actual coordination stops while any required participant is unresolved or on another host.

## 2. Build one ledger

Maintain one monotonic ledger:

```text
coordinationId
epoch
resource = host + platform + UDID
controlTower
currentOwner
participants = task ID + role + cwd + status + runtime profile
activeLease = lease token + active task + bounded operation, or none
queue = ordered ready request IDs
cleanupOwner = resource -> task ID
```

Assign `currentOwner` from live evidence, not input order. Treat an unknown external device user as a blocking owner. Increment `epoch` on every grant, cancellation, recovery, or ownership change; reject replies from older epochs.

For three or more tasks, or before sending any coordination message, read [references/coordination-protocol.md](references/coordination-protocol.md). It defines the state machine, acknowledgement rules, queue behavior, and message templates.

Completion criterion: the ledger accounts for every participant and contains at most one active lease.

## 3. Observe before steering

In `observe` mode, inspect task and runtime state, classify roles, and return the proposed ledger plus exact messages that a live run would send. Perform zero cross-task writes, lease acquisition, or simulator/runtime actions.

For a live run, send one self-contained coordination message per affected task. Include goal, current evidence, requested output, narrow boundaries, coordination ID, epoch, and the observable stop condition. Omit model and reasoning overrides.

Treat successful delivery as `dispatched`, never as acknowledgement. Advance only after a provenance-matched reply from the target echoes the current coordination ID and epoch. Read once after dispatch; if no acknowledgement is present, report the transition as pending and continue non-device work.

Completion criterion: `observe` returns without mutation, or every task whose behavior must change has explicitly acknowledged the current epoch.

## 4. Prepare a live lease

Progress through the message protocol:

```text
REQUEST -> OFFER -> READY -> YIELDED -> GRANT -> ACTIVE
```

`READY` proves the requester understands the exact runtime and critical section. `YIELDED` proves the current owner and its device-using descendants have stopped device interaction. An offer reserves nothing. Only the control tower issues a grant.

Before any FlowCopilot runtime or simulator action, read [references/flowcopilot-runtime.md](references/flowcopilot-runtime.md) and satisfy its preflight. Pin the exact UDID, worktree, Metro port, project root, app identity, native compatibility, and cleanup owner.

After `READY` and `YIELDED`, read [references/lease-helper.md](references/lease-helper.md), then acquire the atomic host lease with [scripts/simulator-lease.ts](scripts/simulator-lease.ts). Use the acquired fencing token in the grant. A collision or malformed existing lease leaves the resource occupied. A stale timestamp triggers inspection and user-directed recovery, never automatic takeover.

Completion criterion: the host lease and logical ledger name the same coordination ID, epoch, controller, active task, UDID, worktree, and bounded purpose before `GRANT` is sent.

## 5. Execute one critical section

The active task may perform only the operation in its grant. Participant tasks continue source-only work. Runtime switching, deep-linking, reload, interaction, screenshot QA, profiling, native install, app-data reset, Maestro, and cleanup all count as device mutations and require the matching lease scope.

After a runtime switch, attest the Metro port and debugger `projectRoot`, effective backend identity, app bundle/native compatibility, and expected test user before accepting QA evidence. Separate native install or destructive QA into an exclusive lease with a recorded restore obligation.

Capture before/after evidence and stop on the grant's observable condition. Keep the booted simulator and unrelated task processes available for the next participant.

Completion criterion: evidence comes from the granted code/runtime and every mutation is inside the declared critical section.

## 6. Release, restore, and advance

Require a provenance-matched `RELEASED` reply containing the token, actions, evidence, and final device/runtime state. Verify the live state, then token-check and release the host lease. Move through:

```text
ACTIVE -> RELEASED -> RESTORED | next REQUEST
```

Restore the prior owner's Metro/app state when the lease changed it, or explicitly grant the next ready task. Each task cleans only processes and sessions it created. Final global cleanup belongs to the initial resource owner and runs only after the queue is empty.

Expiry without `RELEASED` becomes `EXPIRED_UNCONFIRMED`; keep the device blocked until explicit release or user-authorized recovery proves quiescence. Transfer the control-tower role with a new acknowledged epoch before the coordinator finishes with an active lease or queue.

Completion criterion: the old token is invalid before another is granted, the final owner/runtime is stated, and no participant-owned process or device state was cleaned by another task.

## Final report

Return a compact ledger table with task, checkout, role, goal phase, acknowledgement, lease epoch, runtime, and evidence. Distinguish verified state from inference. Confirm:

- every supplied task is accounted for;
- active-lease cardinality never exceeded one;
- no extra simulator was booted;
- every runtime switch and release was acknowledged;
- the current simulator, Metro target, runtime owner, and cleanup owner are known;
- unresolved capabilities or recovery work are explicit.
