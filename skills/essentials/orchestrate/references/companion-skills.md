# Companion Skills

Use this reference when the user or repository names another skill, or when a
specialist skill materially changes the selected lane.

## Resolve the contract

1. Resolve every selected skill by exact name and path.
2. Read its complete instructions and the references required by its active
   branch.
3. Record its authority, mutation behavior, inputs, completion criterion,
   pauses, tools, and internal delegation.
4. Put it in the lane whose work it governs. The orchestrator owns sequence,
   integration, tracker truth, and terminal completion.
5. Count a companion's internal delegates and review axes before creating more.

An explicit companion skill is a user constraint. Do not replace it with a
similar skill without explaining the blocker.

## Place common shapes

| Companion shape | Placement |
| --- | --- |
| Planning or decision workflow | `plan`; preserve all human decision gates |
| Triage workflow | before `implement`; only ready items enter the build frontier |
| Maker or TDD workflow | single write owner in `implement` or `fix` |
| Code-review or audit workflow | fresh read-only owner in `review` |
| Browser or device workflow | lane-specific evidence step and full `qa` gate |
| Domain-modeling workflow | `plan`, or reconciliation after a durable decision changes |
| Adversarial council | optional read-only decision or review gate; never the routine maker |
| Tracker connector | source adapter and state writer; never the source of correctness proof |

## Preserve one control plane

- Do not nest a general orchestrator inside another general orchestrator.
- Let a specialist own its native method, but keep cross-lane ordering in the
  parent.
- Do not duplicate a companion's reviewers with equivalent reviewers.
- Keep one explicit write owner for each file, module, tracker item, device, or
  shared runtime.
- Return companion results to the parent as evidence. A companion cannot
  declare the whole factory complete.

## Default composition examples

- Wayfinder plus `plan`: resolve decision tickets; do not implement the
  destination until implementation work exists.
- Triage plus `plan`: verify and sharpen raw issues into ready work.
- TDD plus `implement`: drive red, green, and refactor at the agreed seam.
- Code review plus `review`: use its independent axes and do not add duplicate
  reviewers.
- Agent-browser plus a UI lane: use semantic browser state and captures for the
  purpose defined by that lane.
- Adversarial council plus `review`: freeze the artifact, keep critics
  independent and read-only, then give accepted findings to `fix`.
