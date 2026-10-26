---
name: optimize-skill
description: Evaluate and improve one target skill through bounded, controlled experiments.
disable-model-invocation: true
---

# Optimize Skill

Treat skill improvement as a falsifiable experiment with two questions: does
the target beat no skill, and does a candidate beat the target? Keep the live
target frozen until one candidate earns adoption.

## 1. Resolve the contracts

1. State the mutation contract and the sole live-target/adoption write owner:
   - `read-only`: evaluate the target and existing frozen variants; create no
     candidate and write only to the experiment workspace;
   - `propose`: allowlisted writers may create disposable candidate copies, a
     proposed eval suite, and experiment artifacts in the workspace, but the
     live target stays unchanged and the result is a patch proposal;
   - `change`: use the same isolation, then let only the adoption owner apply a
     confirmed winner when the original request authorizes it.
2. Resolve the target `SKILL.md`, every active reference and companion, repo
   guidance, current dirty state, and the production invocation path. Record
   whether the agent can invoke the target on its own through its
   `description`, or only a user can.
3. Classify the target as output-only, local-mutating, external-effecting, or
   unsafe, and contain it as the protocol requires. Stop when safe isolation is
   unavailable.
4. Resolve `adversarial-council` from a user-supplied exact path or
   `../adversarial-council/SKILL.md` relative to this file. Verify its
   frontmatter name, then read its complete `SKILL.md` and
   `references/companion-skills.md`. Stop before delegation if the exact
   contract is unavailable. Use the active model-routing policy when present.
5. Read [Experiment Protocol](references/experiment-protocol.md) and
   [Eval Suite](references/eval-suite.md).

Completion criterion: authority, target bundle, invocation path, isolation,
council contract, and the sole write owner are explicit; the live target has
not changed.

## 2. Build the eval suite

Reuse the target's `evals/evals.json` and, for a model-invoked target,
`evals/trigger-evals.json`. Create or extend them until every material branch
has a case.

1. Draw cases from real failures and owner reports first, then add synthetic
   cases for uncovered branches. Each case has a realistic prompt, an answer
   key that two domain experts would accept, and its input files. Include at
   least one boundary case where the skill should hold back.
2. For a model-invoked target, write a balanced trigger set: prompts that need
   the skill and near-misses that share its vocabulary but not its job.
3. Split cases and trigger queries into visible and withheld sets as the
   protocol requires, before any output exists.
4. Pilot each visible case once with the target and once with no skill. Read
   every transcript, then write deterministic checks and assertions from what
   the outputs showed. Write withheld assertions from their answer keys alone.
   A case that fails in both arms for a reason outside the skill is a broken
   task: fix the case, not the skill.

Pilot outputs calibrate the suite; they are never experiment evidence.

Completion criterion: every material branch has a case with an answer key,
checks, and assertions; the split exists; every pilot transcript is read; no
known-broken task remains.

## 3. Freeze the experiment

Fill the experiment card from the protocol before any counted output exists.
Freeze the arms, cases, trials, rubric, grader prompt, environment, practical
improvement rule, tie and regression rules, resource roles, and budget.

Size the budget from the suite: count executor and grader runs per round,
add confirmation and the council, then reserve at least 20%. Default to two
rounds, one challenger per round, two trials per arm and case, and 45 minutes.
Let the user override limits before the first run.

Completion criterion: the card and hashes are frozen before candidate work;
later rubric, case, environment, or threshold changes start a new experiment.

## 4. Measure the baseline

Run the no-skill arm and the target arm on the visible cases and visible
trigger queries under the frozen production-like envelope. Use
`scripts/skill-trials.mjs` as [Eval Suite](references/eval-suite.md)
describes. Record every expected executor and grader in the ledger.

Run deterministic checks first, then the calibrated grader. Read the
transcripts of every failed or divergent trial before trusting a score.

When the target wins no assertion against the no-skill arm and meets no frozen
efficiency target, it adds no measured value on these cases. Report that
before optimizing; a candidate must then earn value, or the recommendation is
to cut or merge the skill.

Completion criterion: both arms are graded, the evaluator detects planted
failures, the target's value over no skill is stated per assertion, and no
unexpected file, tool, network, credential, or external-system effect
occurred.

## 5. Run the visible loop

For each round:

1. Derive one falsifiable hypothesis from failed assertions, transcripts, and
   owner feedback. Fix the general cause rather than the case; prefer
   sharpening or removing instructions over adding rules. One maker may change
   only its isolated candidate; never edit the live target or harness.
2. Compare the target with one candidate at a time, with fresh paired trials
   per arm and case. No executor sees both arms, the opposing output, or the
   hypothesis.
3. Apply deterministic checks before model judgment. Grade the remaining
   assertions and any blind pairwise comparison as the protocol requires.
4. Read [Codex Metrics](references/codex-metrics.md) before making Codex
   token or timing claims. Keep quality, tokens, and time separate; never
   collapse them into one score.
5. Analyze each assertion across arms: an assertion that passes everywhere is
   a regression check, not evidence of skill value; one that fails everywhere
   points to a broken task or assertion. A hard gate must pass in every trial
   (pass^k).
6. Reject a hard-gate regression immediately. Escalate disputed soft evidence
   to four trials only when direction reverses, judges disagree, or the result
   is near the frozen threshold and reserve remains. Mixed evidence is
   inconclusive and keeps the target.
7. Show the owner the visible outputs behind each verdict before a finalist is
   frozen. Feedback that fits the frozen criteria informs the next
   hypothesis; feedback that changes them starts a new experiment.
8. Record newly exposed failures as visible regression cases. Stop at a hard
   cap, after two rounds without replicated practical gain, after an ordering
   reversal remains unresolved, or when no candidate survives.

Rerun missing paired work with the identical brief if budget permits, or
discard that matched pair. Never keep only the favorable arm.

Completion criterion: every candidate is accepted, rejected, or unresolved by
the frozen rule; one immutable finalist or the target remains.

## 6. Confirm once

Hash the finalist and prohibit edits. Open the withheld cases once and repeat
the frozen protocol under its custody rules. A hard failure, missing required
arm or judge, drift, reversal, practical-threshold miss, or inconclusive
minority concern keeps the target and ends this experiment. Any later
candidate needs fresh withheld cases.

Completion criterion: confirmation is complete with zero hard failures and no
missing required evidence, or adoption is blocked explicitly.

## 7. Arbitrate and adopt

When a finalist reaches the adoption gate, give the resolved
`adversarial-council` the protocol's council packet, normally with three
non-overlapping critics and a fresh arbiter. If no finalist survives, skip the
adoption council and report the target. Convene an initial council only when
target risk, objective, or rubric is materially ambiguous; never convene one
for every trial.

Apply lead judgment, recheck the live target hash and dirty state, and reject
overreach. Only the outer write owner may apply the minimal winning diff. Adopt
when the original mutation contract authorizes it; otherwise return the patch
and request authorization. Rerun target and repository validation afterward.

Completion criterion: every council finding is disposed, drift is absent,
authorization covers any adoption, and unrelated state is preserved.

## 8. Report and keep the suite

Lead with `adopt | keep target | cut or merge | inconclusive | blocked`.
Include the frozen card, hashes, ledger, hard gates, the target's value over
no skill, trigger rates, visible and withheld results, judge ties or
disagreement, token and timing scopes, budget used, invalid or missing work,
exact mutations, and remaining uncertainty.

Record the owner's feedback as input to the next experiment. Keep the suite in the target's `evals/`
directory so later edits rerun it as regression evidence: the adoption owner
adds it in `change` mode, and `propose` mode includes it in the patch. Keep
transcripts and run outputs in the workspace, outside Git.

Do not claim statistical significance, non-inferiority, universal superiority,
monetary savings, exact same-turn root totals, or an additive root-plus-worker
campaign cost without separately established evidence. At a cap, return the
partial ledger and perform no adoption.

Finish when the result is traceable to the frozen suite, all expected work is
accounted for, and any claim is limited to the tested cases and environment.
