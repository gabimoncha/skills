# Learn-from-code evaluations

Current profiles are Luna low, Terra low, and Sol low, defined in
[model-matrix.json](model-matrix.json). The historical Sol medium pilot below
retains its original results and settings.

Pilot date: 2026-09-16. Model: `gpt-5.6-sol`, medium reasoning.

We applied the [Agent Skills evaluation guide](https://agentskills.io/skill-creation/evaluating-skills)
to three cases, using fresh-context runs with and without the skill, saved
artifacts, evidence-based assertions, and a second iteration after observed
failures. This is an output-quality pilot, not a cross-model reliability claim.

## Results

Behavior assertions are separated from mechanical file/Git checks so ordinary
correctness does not masquerade as added learning value.

| Case | Without skill | Initial skill | Revised skill |
| --- | --- | --- | --- |
| First educational code review | 3/5 | 4/5 | 5/5 |
| Familiar concept in a second project | 4/5 | 4/5 | 5/5 |
| Practice without source code or a learner answer | 4/4 | 4/4 | 4/4 |
| **Behavior total** | **11/14** | **12/14** | **14/14** |
| Mechanical file/Git checks | 7/8 | 8/8 | 8/8 |

Nine task executions were performed: six paired runs in iteration 1, then three
fresh runs of the revised skill. Iteration 2 reuses the original no-skill baseline
explicitly; it does not count those outputs as new executions. Two independent
Sol medium grading agents evaluated the output artifacts against the same
assertions. They did not receive the proposed fixes or skill instructions.
Configuration labels were visible; this was not a blinded comparison.

## What the runs exposed

1. **Incomplete practice material.** The initial skill saved three concepts but
   left two with `Practice: —`. The baseline also lacked separate answer keys.
   The record guidance now distinguishes one question asked in conversation from
   a saved question and answer for each new verified concept. The rerun contains
   practice material for all three concepts.
2. **False transfer credit.** The initial shared notebook said “Prior understanding
   transferred correctly” despite the prompt explicitly identifying the new code
   as AI-authored. The guidance now reserves transfer credit for an independent
   learner application and explanation. The rerun records the implementation as
   “consistent with” the earlier principle, preserving the prior assessment and
   practice dates.

Only these two short changes were made to the skill's learning-record guidance.
The main skill and template were unchanged during iterations 1–2.

The baseline explained the Python behavior correctly and handled pending practice
without inventing a learner answer. The revised skill's observable added value
was separate encounter/understanding tracking, complete saved practice material,
and carrying an encounter forward across projects. It also ignored the new
practice notebook in Git, which the baseline did not do.

Eleven behavioral assertions passed in both the revised and baseline runs. Keep
them as regression checks, not evidence of skill advantage. The three remaining
behavioral assertions distinguish the revised skill in this pilot. The initial
both-fail practice-material check was investigated and improved rather than
discarded merely to raise a score.

## Inspect the evidence

Raw outputs are retained locally in the ignored `workspace/` inside the skill. All learner
histories and project code in these runs are synthetic fixtures. Historical output
contents and hashes are preserved; absolute paths inside those artifacts may refer
to the previous workspace location. The report links point to the current location.

- [Iteration 1 benchmark](../workspace/iteration-1/benchmark.json)
- [Iteration 2 benchmark](../workspace/iteration-2/benchmark.json)
- [Revised first-review notebook](../workspace/iteration-2/eval-first-review/with_skill/outputs/project/LEARN.md)
- [Revised shared notebook](../workspace/iteration-2/eval-shared-concept/with_skill/outputs/notebook/LEARN.md)
- [Revised practice reply](../workspace/iteration-2/eval-practice-only/with_skill/outputs/response.md)

Each executed run has `outputs/`, `review.json` with semantic evidence,
`grading.json` with combined checks, and `timing.json`. Iterations retain skill
snapshots and hashes. The tool did not expose reliable execution/token telemetry;
those benchmark values are null. Worker-reported durations, where present, are
kept separately and excluded from performance comparisons. Full execution
transcripts were not exported by this harness.

## Repeat the evaluation

From the repository root, choose an unused iteration number and a profile from
[model-matrix.json](model-matrix.json): `luna-low`, `terra-low`, or `sol-low`.
The user's “light” setting is represented by the supported `low` reasoning level.
Prepare a new iteration:

```sh
python3 skills/essentials/learn-from-code/evals/prepare.py --iteration 9 --profile luna-low
```

By default this suite prepares fresh no-skill runs too. Use `--baseline-iteration`
only for a completed baseline with the same model, reasoning effort, and cases;
the scripts reject incompatible baselines, including reuse of the historical
Sol medium baseline for a low-effort run. The script creates
isolated fixture Git repositories, snapshots the skill without the eval suite,
and refuses to overwrite an existing iteration.

For each prepared run, start a fresh context using the model and reasoning effort
recorded in `evals-snapshot.json`, with its `prompt.txt`,
`outputs/project` as the working project, and writes restricted to that run's
`outputs/`. Supply only `skill-snapshot/SKILL.md` and its references for with-skill
runs; load no skill for baseline runs. Do not expose assertions, expected outputs,
other runs, or development history. Save the exact final reply to
`outputs/response.md`. When a learner response is needed, stop with the question;
do not synthesize a learner answer.

Have a separate Astra medium grading context inspect each completed run and the assertions in
`evals-snapshot.json`. Save `review.json` with an `assertion_results` array in
assertion order; each item has `text`, boolean `passed`, and concrete `evidence`.
Then aggregate and run mechanical checks:

```sh
python3 skills/essentials/learn-from-code/evals/grade.py skills/essentials/learn-from-code/workspace/iteration-9
```

The scripts prepare and grade artifacts; model dispatch remains an explicit
fresh-context operation. Human review is still pending in each iteration's
`feedback.json`; agent grades are not human approval.

For regrading saved outputs, archive the previous `review.json`, `grading.json`,
and `benchmark.json` under `grading-history/<grader-profile>/` first. Record the
new grader's `model` and `reasoning_effort` in `grading-metadata.json` at the
iteration root; the aggregator uses this override while preserving the original
execution snapshot. Replace `review.json` only after an independent grading pass,
then run `grade.py` again. Regrading does not count as another task execution.

## Limits and next coverage

There is one execution per case per configuration, no held-out set, and no
measured retention outcome. The small score increase cannot establish statistical
reliability or effectiveness on other models. Review the actual lesson density
and difficulty: the revised practice run adds a worked example before its pending
question, which passes the checks but may be too much scaffolding for some users.

Useful next cases are a second invocation of the same session, version-mismatched
third-party documentation, unavailable shared storage, and an actual learner
answer across multiple turns. Real Git synchronization was not exercised.
Cross-model coverage is limited to the invocation checks reported below.

## Bare invocation and optional guidance: iteration 3

The original pilot supplied filenames, learning topics, and notebook instructions.
Its passing scores did not establish that a beginner could invoke the skill alone.
After clarifying that product requirement, the skill now explicitly defaults to
review, discovers scope, selects learning topics, and accepts optional natural
language guidance. The UI default prompt is simply `Use $learn-from-code.`

Two fresh Sol medium executions used the additional
[invocation suite](invocation-evals.json):

| Input | Context | Behavior checks |
| --- | --- | --- |
| `$learn-from-code` | Staged `cart.py`, unstaged `pricing.py`, untracked `draft.py` | 5/5 |
| `$learn-from-code I've just started learning Python and object ownership.` | PR base/head refs supplied by task context; unrelated local `scratch.py` edit | 4/4 |

Both runs selected relevant lessons and created learning notes without asking
the learner to identify targets, experience level, or concepts. The PR run
excluded the unrelated local change. All six mechanical checks passed, including
preservation of the pre-existing staged state, source contents, and PR history.

These are invocation regression checks with an independent evidence-based grader,
not a new no-skill comparison. The PR fixture uses local refs; hosted PR API
integration was not tested. One run per case does not establish reliability.

- [Iteration 3 benchmark](../workspace/iteration-3/benchmark.json)
- [Bare invocation reply](../workspace/iteration-3/eval-bare-local-invocation/with_skill/outputs/response.md)
- [PR invocation reply](../workspace/iteration-3/eval-pr-context-invocation/with_skill/outputs/response.md)

To prepare this suite again, choose an unused iteration number:

```sh
python3 skills/essentials/learn-from-code/evals/prepare.py --iteration 9 --suite invocation-evals.json --profile luna-low
```

Use `prompt.txt` as the complete user message, and supply `context.txt` when
present as existing task context. The remaining execution and grading procedure
is the same. Timing and token telemetry remain unavailable; human review is pending.

## Low-effort model comparison: iterations 4–6

Both suites now select models through the shared model matrix. We ran the two
invocation cases once each on Luna low, Terra low, and Sol low: six fresh-context
executions, all using identical skill snapshots and fixtures. The skill was held
fixed throughout this comparison. A separate Astra medium context regraded every
saved output against the assertions without seeing previous grades, followed by
the mechanical checks in `grade.py`. The original Sol low grades are archived
under each iteration's `grading-history/sol-low/`; no task executions were repeated.

| Model | Bare invocation | PR with optional guidance | Mechanical checks |
| --- | --- | --- | --- |
| `gpt-5.6-luna`, low | 5/5 | 4/4 | 6/6 |
| `gpt-5.6-terra`, low | 5/5 | 4/4 | 6/6 |
| `gpt-5.6-sol`, low | 5/5 | 4/4 | 6/6 |

All three models discovered the review scope, explained the seeded Python issues,
and recorded practice without claiming the learner had demonstrated understanding.
They preserved source files, staged changes, and Git history. The aggregate is
27/27 behavioral assertions and 18/18 mechanical checks.

The Astra grader also flagged two issues outside the current assertions in Terra's
bare-invocation notebook: an example leaves the observation timing of shared-list
contents ambiguous, and a proposed `(values, values + [item])` return preserves
the input during the call but leaves the first result aliased to the caller's
list. It does not create an independent snapshot. Passing the current assertions
therefore does not establish that every explanation or suggested fix is correct.

- [Luna low benchmark](../workspace/iteration-4/benchmark.json)
- [Terra low benchmark](../workspace/iteration-5/benchmark.json)
- [Sol low benchmark](../workspace/iteration-6/benchmark.json)

These are small invocation smoke tests, with no new no-skill baseline. The original
three workflow cases are configured for all three profiles but were not rerun in
this comparison. One execution per case cannot establish reliability or rank the
models. Cost, latency, retention, and third-party API accuracy were not measured.
The historical Sol medium results above retain their original model settings.

## Teaching accuracy follow-up: iterations 7–8

The two Astra findings became explicit assertions in the bare-invocation case:
distinguish immediate observations from saved references after later calls, and
preserve snapshot independence while explaining the limits of shallow copies.
Historical snapshots keep their original assertions and scores.

The first revision added a short verification instruction to the review workflow.
Two fresh Terra low runs, independently graded by Astra medium, passed 10/11
behavioral assertions and all six mechanical checks. The snapshot correction
passed; the bare case still left observation timing implicit. Astra also found a
practice prompt referring to an existing guard absent from the actual function.
The skill was tightened to require self-contained examples checked against actual
code, including needed guards, and the two observation points explicitly.

- [Iteration 7 benchmark](../workspace/iteration-7/benchmark.json)

Iteration 8 isolates the bare-invocation case from the same suite for a targeted
Terra low rerun with Astra medium grading. The unchanged assertions and fixture
are retained in its evaluation snapshot. These follow-ups are regression checks,
not evidence of learning retention or reliability across models.

The targeted rerun passed 6/7 behavioral assertions and all three mechanical
checks. Its answer key correctly states that both saved references contain both
items after the second call, and the snapshot fix uses separate shallow copies.
The practice prompt no longer assumes a nonexistent guard. The remaining failed
assertion requires explicitly contrasting this final state with observations made
immediately after each call; that contrast is still omitted. Keep this failure
visible rather than weakening the assertion or treating the revision as fully
validated. Astra identified no additional technical concerns in this rerun.

- [Iteration 8 benchmark](../workspace/iteration-8/benchmark.json)
- [Revised notebook](../workspace/iteration-8/eval-bare-local-invocation/with_skill/outputs/project/LEARN.md)
