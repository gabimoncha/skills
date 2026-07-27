# Experiment Protocol

Use this reference to freeze an evaluation before any baseline or candidate
output exists. The protocol governs skill behavior, not one domain-specific
notion of quality.

## Experiment card

Record these fields in a temporary or repo-native scratch artifact:

```yaml
experiment_id:
mode: read-only | propose | change
write_owner:
target:
  skill_path:
  baseline_hash:
  bundle_hash:
  invocation_path:
  risk: output-only | local-mutating | external-effecting | unsafe
objective:
material_branches:
hard_gates:
primary_quality_metric:
practical_improvement:
tie_rule:
regression_rule:
resource_policy:
  token_role: diagnostic | ceiling | target
  token_limit:
  timing_role: diagnostic | ceiling | target
  timing_limit:
visible_cases:
withheld_case_count:
environment:
  host:
  model:
  effort:
  context:
  tools:
  permissions:
  output_budget:
comparison_order:
budget:
  rounds:
  challengers_per_round:
  agents_including_nested:
  token_checkpoint:
  wall_time:
  reserve_percent:
stop_rules:
```

Hash exact bytes for the target and every active reference or companion. Hash
case inputs, rubric, judge prompt, and environment description. Changing any
frozen field invalidates existing comparisons and begins a new experiment.

## Contain the target

| Target class | Execution rule |
| --- | --- |
| Output-only | Run read-only against disposable outputs. |
| Local-mutating | Run only in an isolated copy/worktree with an explicit write allowlist. |
| External-effecting | Use mocks, a dry-run interface, or a user-authorized sandbox. |
| Unsafe or unisolatable | Stop before execution. |

The mutation contract governs candidate writes. In `read-only` mode, compare
only existing frozen variants. In `propose` or `change` mode, separately
enumerated candidate writers may write only their own disposable variant and
experiment artifact allowlist. The sole adoption owner controls the live
target. Executors, judges, critics, and arbiters remain read-only. Protect the
baseline, cases, rubric, and harness from target writes. Compare pre/post
filesystem state and the tool ledger; an unexpected side effect invalidates
the run.

## Partition evidence

Visible cases guide candidate work. Withheld cases answer whether the frozen
finalist transfers beyond evidence used during search.

- Begin with at least three visible and two withheld cases.
- Expand both sets until every material branch and major failure class is
  represented; the numeric floor never substitutes for coverage.
- Keep withheld content out of makers, candidate authors, visible executors
  and judges, and ordinary traces. Only assigned confirmation executors and
  judges may receive it after the finalist is frozen.
- Treat a viewed withheld result as burned. A later edit requires a new set.
- Continue after a custody leak only when at least two unexposed cases frozen
  at the start still preserve all required coverage. Never add a replacement
  case to the current experiment.
- If shared storage prevents strong custody, disclose the limitation and use
  the term `withheld`.
- Convert private histories into minimal synthetic or redacted cases. Never
  forward raw rollouts, credentials, identities, unrelated prompts, or traces.

## Build matched trials

Pin the model provider, model, effort, system/role surface, context window,
task bytes, skill bytes, repo fixture, sandbox, network, tools, output budget,
and concurrency policy. Record mismatches rather than smoothing them away.

Interleave or randomize condition order. When latency affects selection, do not
run compared conditions concurrently. A writer/executor may batch all cases
for one arm, but must not see both arms or the opponent's output.

Use two replicas per arm and case. Expand the disputed comparison to four only
for disagreement, reversal, or threshold proximity. A hard failure is not
noise and cannot be averaged away.

## Evaluate in layers

1. Apply deterministic hard gates.
2. Compute the one primary task-quality metric.
3. Record secondary diagnostics.
4. Use blind pairwise judging only for residual subjective criteria.
5. Record tokens and time separately from quality.

For subjective judging:

- Calibrate the frozen rubric with good, bad, and borderline non-benchmark
  artifacts.
- Use opaque variant IDs and randomize presentation order per judge.
- Permit ties.
- Give judges the task, rubric, and delimited untrusted artifacts only.
- Hide diffs, hypotheses, candidate names, costs, history, and prior scores.
- Use two judges and a third only to resolve a disputed comparison.

Council critics know the hypotheses and evidence history, so they cannot also
be blind judges.

## Select conservatively

A candidate may reach confirmation only when it:

- passes every hard gate;
- meets the frozen practical improvement rule on visible evidence;
- shows no material retained-behavior regression;
- remains inside resource ceilings;
- survives any required adaptive replication.

Ties, persistent judge disagreement, direction reversals, threshold misses,
or missing matched evidence keep the baseline. Preserve visible failures as
regression cases, but never relabel them as withheld evidence.

Freeze at most one finalist. On withheld cases, require zero hard failures,
complete matched evidence, the practical quality threshold, and any frozen
efficiency condition. A failed confirmation ends the experiment.

## Keep a complete ledger

Use one row per expected unit of work:

| Field | Meaning |
| --- | --- |
| `id` | Opaque role/case/replica identifier |
| `role` | maker, executor, verifier, judge, critic, arbiter |
| `arm` | Opaque condition ID |
| `case_set` | visible or withheld |
| `status` | pending, complete, partial, blocked, timed_out, cancelled |
| `hard_gates` | pass/fail with evidence |
| `quality` | Primary metric or pairwise result |
| `tokens` | Exact scope and provenance, or unavailable |
| `timing` | Duration scope and provenance, or unavailable |
| `notes` | Retry, mismatch, leakage, or invalidation reason |

A missing result is missing evidence, never a zero. Rerun that matched
baseline/candidate replica pair within budget or discard both members of that
pair.

## Prepare the council packet

At the adoption gate, give the council:

- frozen card, hashes, authorization, and mutation contract;
- expected-role ledger including blockers and invalid work;
- hard-gate evidence;
- anonymized visible and withheld results kept distinct;
- primary quality result and judge agreement;
- resource metrics with scopes and comparability warnings;
- finalist diff, target drift check, and unresolved uncertainty.

The council adjudicates the evidence; it does not rescore blinded outputs.

## Bound the claim

Allowed conclusion:

> In the pinned environment and enumerated cases, the frozen candidate passed
> all hard gates and met the predeclared primary-quality rule, with the reported
> token and timing observations.

Do not generalize beyond the tested branches. Small repeated benchmarks support
engineering decisions, not default claims of significance, non-inferiority, or
universal superiority.
