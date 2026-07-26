---
name: adversarial-council
description: Convene independent reviewer subagents and a fresh arbiter around any task.
disable-model-invocation: true
---

# Adversarial Council

A **council** is not a vote. Independent critics attack a task through
non-overlapping lenses; a fresh **arbiter** reconciles their evidence into one
answer. The parent agent owns grounding, authorized mutations, and the final
result.

## 1. Ground the case

1. Read the exact request, applicable instructions, target artifacts, and
   authoritative sources before delegation.
2. State the mutation contract: `read-only`, `propose`, or `change`. Give the
   council a frozen target or source snapshot. For Git work, capture the
   starting status and comparison point.
3. Turn the request into a **case brief**:
   - the question the council must answer;
   - the intended outcome, and whether that outcome is fixed or itself under
     review;
   - the intended deliverable and audience;
   - in-scope and out-of-scope surfaces;
   - fixed facts, user decisions, and success criteria;
   - sources each critic can inspect;
   - uncertainties that require proof.
4. When the prompt names or links another skill, repository guidance requires
   one, or a selected specialist skill materially changes a stage, read
   [Composing Companion Skills](references/companion-skills.md) before assigning
   it.

For a fixed intent, challenge whether the target achieves it. Revisit the intent
itself only when the case brief puts that question in scope.

Completion criterion: the exact question, intended outcome, target snapshot,
mutation contract, scope, constraints, sources of truth, and success criteria
are explicit.

## 2. Seat the council

Choose three to five critics. Give every material dimension exactly one owner.
Derive task-specific names from these lenses, merging or replacing any that
overlap:

1. **Fidelity** — user intent, specification, standards, and fixed constraints.
2. **Domain** — correctness and quality in the task's native discipline.
3. **Failure** — assumptions, edge cases, harms, regressions, and abuse cases.
4. **Proof** — evidence quality, calculations, testability, and uncertainty.
5. **Alternatives** — what can be removed, the strongest rival approach,
   audience consequences, and opportunity cost.

Use three seats for a narrow case and five when the case is consequential,
ambiguous, or spans distinct surfaces. Retask the closest seat for a lens the
user explicitly names. Add a seat only when its question remains independent
after that test. Scale by independent questions and consequence, not raw
artifact size.

Write one sentence for each seat: “This critic alone owns whether …”. Remove
overlap before spawning.

Completion criterion: every material dimension has one owner, every seat asks a
distinct falsifiable question, and assigned companion skills fit that question.

## 3. Dispatch independent critics

Run critics concurrently in fresh contexts. On Codex, use
`fork_turns: "none"`; elsewhere use the surface's equivalent. Reconstruct each
context from the same case brief, current target, sources, and constraints, plus
only its own lens and assigned companion skills. Reviewer seats are read-only;
when changes are authorized, keep one explicit write owner outside the council.

Lens diversity is the baseline. When the user requests cross-model review and
the active routing policy exposes an authorized second model family, place at
least one seat on it and record the actual model and surface for every seat. Use
fresh same-model contexts when cross-model execution is unavailable.

Require each report to contain:

1. a direct verdict on its owned question;
2. findings labeled `blocking`, `material`, or `advisory` and ranked by
   consequence;
3. stable evidence for every material claim;
4. the concrete consequence or failure scenario behind each finding;
5. the strongest contrary evidence or reason the verdict could be wrong;
6. uncertainties and the proof needed to resolve them;
7. a recommended action and what should remain unchanged.

`Blocking` prevents the intended outcome, `material` degrades it, and
`advisory` is an optional improvement.

For repository work, require current `file:line` citations. For other work,
require the strongest stable locator available: source and section, URL,
dataset row, screenshot region, calculation, or quoted requirement. Match
verification to the task instead of treating unsupported consensus as proof.

Seal each report before exposing any other critic's conclusions. Continue
useful parent-level grounding or verification while the council runs.

Before arbitration, enumerate the expected seats and verify that every report
is present and non-empty. Carry missing or blocked seats into the arbiter brief
instead of silently shrinking the council.

Completion criterion: every seat returns the required report or a concrete
blocker, every material claim is traceable, and reports were formed
independently.

## 4. Appoint the arbiter

After all reports arrive, create one fresh arbiter. Give it the complete case
brief, current target and sources, all critic reports, and no preferred winner.
Use the active model-routing policy for a judgment-heavy pass when one exists.

Require the arbiter to:

1. verify material claims against the current source;
2. resolve disagreement by evidence, user intent, and fixed constraints rather
   than majority vote;
3. classify every material finding as `accept`, `merge`, `reject`, or
   `unresolved`, with a reason;
4. preserve a minority concern when evidence leaves it plausible;
5. produce one prioritized recommendation, including tradeoffs and what to
   keep;
6. answer the user's exact question and identify the next decisive validation.

Use a narrow verifier for a disputed factual claim the arbiter cannot check.
Route judgment disagreements directly through the arbiter.

Completion criterion: every material finding has a disposition, conflicts are
resolved or exposed, and the synthesized recommendation follows the case
constraints.

## 5. Complete the task

Re-check the target for drift before acting on the verdict.

Apply **lead judgment**: verify the arbiter's decisive claims, reject false
positives, overreach, and objections that mistake style for substance, and
explain any override with evidence. The parent remains accountable for the
answer.

- For a review or decision request, deliver the adjudicated answer.
- For a generative request, turn the verdict into the requested artifact.
- For an authorized change, use one parent or maker to apply the adjudicated
  changes, then run focused verification against the original case brief.

Return the direct outcome first, followed by a compact council ledger, the
arbiter's decisive reasoning, unresolved proof obligations, verification
status, and any mutations performed.

Finish when the user's deliverable is complete, every material council finding
is accounted for, verification matches the risk, and unrelated state remains
preserved.
