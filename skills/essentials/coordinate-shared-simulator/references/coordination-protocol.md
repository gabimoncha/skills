# Shared-simulator coordination protocol

Use **task ID** in user-facing text; current Codex task wrappers may call it a `threadId`. A lease serializes the simulator and any runtime handover. It does not move Git state.

## Contents

- [Inputs and roles](#inputs-and-roles)
- [Capability gate](#capability-gate)
- [Ledger](#ledger)
- [Lease state machine](#lease-state-machine)
- [Message templates](#message-templates)
- [Queue and recovery rules](#queue-and-recovery-rules)
- [Completion criteria](#completion-criteria)

## Inputs and roles

Normalize the supplied IDs by removing exact duplicates while preserving order.

- **One ID:** coordinate the caller with that supplied task; create no helper task. Infer owner/requester from live evidence and the stated goal.
- **Two IDs:** use the caller as control tower unless the user names another coordinator; preserve listed order among actual requesters.
- **N IDs:** retain a FIFO queue for every requester. An ID with no device goal remains an observer and does not occupy a queue slot.

Roles are per epoch and may overlap:

- **control tower:** owns the ledger, queue, epoch, logical grants, and verification.
- **owner:** holds the one active token and performs the bounded critical section.
- **requester:** waits in FIFO order with a stated goal and stop condition.
- **observer:** acknowledges quiescence and may continue source-only work.

## Capability gate

Discover capabilities first; wrapper names can drift. Current likely names are:

| Capability | Likely wrapper |
| --- | --- |
| discover/resolve tasks | `list_threads` |
| read a task without resuming it | `read_thread` |
| send a background follow-up | `send_message_to_thread` |

Validate every ID, host, checkout, current status, and role through read-only calls. A successful send means **dispatched**, not received or applied. Confirm every response by reading an explicit ACK from the target.

Operate through the exposed task wrappers. Never open a raw app-server client for coordination. Treat an absent, failed, timed-out, or incomplete read/send capability as unavailable for the current epoch. Fall back to an observe-only dry run and emit copyable relay packets. Resume live coordination only after the user relays exact participant ACKs.

`handoff_thread` is for relocating a task and Git state. Keep simulator ownership in this lease protocol.

## Ledger

Keep one row per task plus one resource record. Record:

```text
coordination_id, epoch, state, task_id, role, host, cwd, goal, queue_position,
message_id, acked_message_id, quiesced, udid, runtime_cwd, metro_port,
token, allowed_action, stop_condition, started_at, released_at,
evidence, final_state, restore_target, failure_or_deferral_reason
```

The epoch is a monotonically increasing integer scoped to `coordination_id`. Generate a fresh random token for each `GRANT`; store it only in the current owner row and host lock.

## Lease state machine

Advance in exactly this order:

`REQUEST → OFFER → READY → YIELDED → GRANT → ACTIVE → RELEASED → RESTORED`

| State | Checkable meaning |
| --- | --- |
| `REQUEST` | A requester states one resource, bounded action, stop condition, and restore target. |
| `OFFER` | The tower assigns the queue head an epoch and broadcasts the proposed scope. |
| `READY` | The candidate owner reports its preflight, intended runtime, and no active device mutation. |
| `YIELDED` | Every other participant ACKs this epoch and reports device/runtime action `none`; any previous owner has stopped. |
| `GRANT` | The tower atomically acquires the host lease and sends the matching token to exactly one owner. |
| `ACTIVE` | That owner ACKs the grant message and token before beginning the critical section. |
| `RELEASED` | The owner has stopped, reports evidence and live final state, and requests token-checked release. |
| `RESTORED` | The tower verifies handback, releases the matching host lease, invalidates the token, and closes the epoch. |

No expiry authorizes takeover. Expiry triggers re-read, simulator/runtime inspection, and explicit recovery; a stale host lock requires confirmation that the previous owner is inactive before force-reclaim approval is requested.

## Message templates

Use a fresh `message` UUID on every outbound message. `from`, `to`, and `via` preserve provenance; manual relays set `via=manual-relay relayed_by=<user-or-task>`.

```text
COORD REQUEST coordination=<uuid> epoch=<n> message=<uuid>
from=<task-id> to=<control-tower-id> via=<task-tool|manual-relay>
resource=ios-simulator:<udid-or-discover> runtime=<cwd-or-none>
action=<one bounded operation> stop=<observable condition> restore=<state-or-none>
```

```text
COORD OFFER coordination=<uuid> epoch=<n> message=<uuid>
from=<control-tower-id> to=<task-id> via=<task-tool|manual-relay>
candidate=<owner-id> resource=ios-simulator:<udid> runtime=<cwd-or-none>
action=<bounded operation> stop=<condition> restore=<state-or-none>
Reply with READY if candidate; otherwise YIELDED after your atomic device action ends.
```

```text
COORD ACK state=<READY|YIELDED> coordination=<uuid> epoch=<n>
message=<new-uuid> ack=<offer-message-uuid> from=<task-id> to=<tower-id>
via=<task-tool|manual-relay> cwd=<cwd> host=<host>
device_action=none runtime_action=none runtime=<cwd-or-none> goal_phase=<short>
```

```text
COORD GRANT coordination=<uuid> epoch=<n> message=<uuid> token=<random>
from=<tower-id> to=<owner-id> resource=ios-simulator:<udid>
runtime=<cwd-or-none> metro_port=<port-or-none>
allowed=<bounded operation> stop=<condition> restore=<state-or-none>
Reply ACTIVE with ack=<this-message> and the same token before acting.
```

```text
COORD ACK state=ACTIVE coordination=<uuid> epoch=<n> token=<random>
message=<new-uuid> ack=<grant-message-uuid> from=<owner-id> to=<tower-id>
udid=<udid> runtime=<cwd-or-none> metro_port=<port-or-none>
```

```text
COORD RELEASED coordination=<uuid> epoch=<n> token=<random>
message=<uuid> ack=<grant-message-uuid> from=<owner-id> to=<tower-id>
actions=<short list> evidence=<paths-or-results> final_state=<device-and-runtime>
```

```text
COORD RESTORED coordination=<uuid> epoch=<n> message=<uuid>
from=<tower-id> to=<all-task-ids> released_token=<token>
verified_state=<device-and-runtime> next=<task-id-or-none>
```

An ACK is valid only when its observed sender matches `from`, `ack` names the current outbound message, and coordination ID, epoch, and token (when present) match the ledger. Log and ignore lower-epoch messages. Pause on a future epoch or mismatched token until provenance is resolved.

## Queue and recovery rules

- Append new requesters to the FIFO tail; offer only the head.
- Remove or defer a requester only with a recorded reason. Preserve the relative order of all others.
- Increment the epoch after `RESTORED`, before offering the next owner. Never reuse an epoch or token.
- Keep non-owners source-only from their `YIELDED` ACK until `RESTORED` or an explicit cancellation for that epoch.
- In observe-only dry run, perform task reads, filesystem/runtime inspection, and device listing only. Acquire no lock, send no grant, and mutate no simulator/runtime state; return the proposed ledger and relay packets.

## Completion criteria

The run is complete only when every supplied ID is resolved or named as unsupported; every participant has a host, cwd, role, queue result, and current ACK status; one exact UDID and runtime owner (or `none`) are stated; lease intervals do not overlap; all runtime changes were acknowledged; the final token is invalid; live handback state and evidence are recorded; and no extra simulator was booted. A dry run completes with the same inventory plus copyable messages and an explicit `no mutation performed` result.
