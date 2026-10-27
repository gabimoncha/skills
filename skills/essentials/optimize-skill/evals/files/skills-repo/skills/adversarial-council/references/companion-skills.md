# Composing Companion Skills

Read this file when the council will use another skill.

## Resolve the contract

1. Resolve every selected skill by exact name and path.
2. Read its complete `SKILL.md` and every reference its active branch requires.
3. Record its mutation behavior, completion criterion, required tools, user
   pauses, and whether it delegates again.
4. Assign it to the stage whose work it actually governs. Include the exact
   skill name or path in that agent's brief.

An explicitly named skill is part of the user's case constraints. A missing or
unreadable skill is a concrete blocker when its behavior cannot be reproduced
from an authoritative source.

## Place by contract

| Skill shape | Council placement |
| --- | --- |
| Rubric or reference | Give it only to critics whose lens needs it. Require them to apply its full active checklist. |
| Bounded reviewer | Let its review axes replace matching council seats. Count any internal subagents toward available concurrency. |
| Maker or mutating workflow | Give it to the single authorized write owner. Freeze the resulting artifact before reviewers inspect it. |
| Orchestrator or interactive workflow | Run it as a parent-level branch or reserve capacity for its nested agents. Preserve any required user decision instead of burying the pause inside a critic. |

Use the environment's model-routing skill or policy before spawning when one is
available. Honor a user-specified model or effort and select only combinations
the active surface exposes. When an assigned skill may delegate again, include
that routing policy in the delegated agent's brief.

## Preserve independence

- Assign a companion skill only where it changes the lens or output contract.
- Give each critic the minimum skill material needed for its seat.
- Treat a companion skill's internal axes as occupied seats instead of creating
  duplicate critics.
- Keep one write owner. Council critics inspect a shared snapshot and return
  reports rather than competing edits.
- Include both the case brief and the companion skill's completion criterion in
  the assigned agent's prompt.

## Examples

### `code-review`

Use its Standards and Spec axes as the Fidelity portion of the council. Because
the skill already delegates independent axes, reserve capacity for its nested
reviewers and avoid separate Standards or Spec seats. Feed its two reports to
the final arbiter alongside the remaining council reports.

### `improve-codebase-architecture`

Use its exploration and candidate-report sequence as an architecture branch.
Preserve its required user choice before any grilling or domain-model mutation.
After candidates exist, let the council challenge their depth, evidence,
tradeoffs, and fit with the user's selected direction.

### `frontend-design`

For an authorized build, give it to the single maker and freeze the resulting
interface before the council reviews visual direction, usability, technical
constraints, and proof. For a read-only request, a design critic may use its
criteria as disclosed reference while keeping the council's read-only contract;
report that this is a rubric application rather than completion of its
implementation workflow.
