# Eval Suite

Read this reference before you create, extend, or run a target's eval suite.
The suite lives in the target's `evals/` directory and outlasts any one
experiment; run outputs live in a workspace outside Git.

## Layout

```text
<skill>/
├── SKILL.md
└── evals/
    ├── evals.json           # output cases
    ├── trigger-evals.json   # model-invoked targets only
    └── files/               # fixtures copied into each trial
<collection>/<skill>-workspace/
└── iteration-N/
    ├── skill-snapshot/      # exact bytes of each skill arm
    ├── evals-snapshot.json  # the suite the trials ran with
    ├── plan-<arm>.json      # planned cases and trials per arm
    ├── eval-<name>/<arm>/trial-<k>/
    │   ├── transcript.jsonl # final attempt; transcript-attempt-<n>.jsonl keeps all
    │   ├── run.json         # prompt, hashes, attempt log, tool calls, changed files
    │   ├── timing.json      # tokens, duration, cost, cost of all attempts
    │   ├── grading.json     # check and assertion verdicts with evidence
    │   └── outputs/         # answer.md and declared output files
    ├── trigger/             # trigger-results.json and probe transcripts
    ├── benchmark.json
    └── feedback.json        # owner review, keyed by eval
```

## Output cases

```json
{
  "skill_name": "example",
  "evals": [
    {
      "id": 1,
      "name": "short-kebab-name",
      "prompt": "A realistic user message with the paths and context a real user gives.",
      "expected_output": "The answer key: what a correct result contains, specific enough that two domain experts reach the same verdict.",
      "set": "visible",
      "files": ["evals/files/fixture"],
      "outputs": ["report.md"],
      "checks": [
        { "type": "no_mutation", "allow": ["report.md"] },
        { "type": "citations", "min": 3 },
        { "type": "subagents", "min": 2 }
      ],
      "assertions": [
        "One observable claim per assertion, checkable from the output alone."
      ]
    }
  ]
}
```

`set` is `visible` (the default) or `withheld`. The grader sees subagent
briefs as evidence; set `"briefs": false` when only one arm delegates, because
the briefs then reveal the arm. `outputs` lists files the
trial writes; the runner keeps them for the grader and the owner, so a grade
rests on the file and not on the agent's description of it.

Write cases that vary phrasing, detail, and formality. Plant facts the answer
key depends on, such as stale documentation or a decoy, so a correct answer
needs the skill's process and not only a lucky search. Give every case an
answer key before the pilot; add assertions after reading pilot outputs.

A good assertion is specific, observable, and robust to valid wording:
"States that POST is retried only with an Idempotency-Key" rather than "The
answer is good" or an exact phrase. Put mechanical properties in `checks`, not
assertions. Keep subjective qualities for blind pairwise judging or owner
review.

## Trigger cases

```json
[
  { "query": "a prompt that needs the skill", "should_trigger": true },
  { "query": "a near-miss that shares its vocabulary but not its job", "should_trigger": false, "set": "withheld" }
]
```

Write 16 to 20 queries, half of each kind, at varied lengths and levels of
formality. The best negatives are near-misses: neighbouring skills' jobs, a
single lookup the skill would over-serve, or an implementation request using
the same nouns. Run each query three times; a query passes when its trigger
rate is at least 0.5 for `should_trigger: true` and below 0.5 otherwise. A
query with fewer valid runs than planned is unresolved.

## Run trials

`scripts/skill-trials.mjs` runs each trial in a fresh temporary Git repository
built from the case's `files`. In Claude Code it runs `claude -p` with
`--setting-sources project`, so user-level skills, settings, and memory stay
out. With `--harness codex` it runs `codex exec --json --ignore-user-config`
with `HOME` set to an empty directory, and moves the trial's rollouts out of
`CODEX_HOME/sessions` into the run directory. Codex still loads
`CODEX_HOME/AGENTS.md` in every arm; record that as an environment fact.

A skill arm installs the skill without its `evals/` directory, plus each
`--companion`, and invokes it as `/<name>` or `$<name>`. A run without
`--skill` is the no-skill arm. Keep installed skills out of fixtures, or the
no-skill arm sees them too.

```sh
S=scripts/skill-trials.mjs
node $S run --evals <skill>/evals/evals.json --out <iteration> --set visible \
  --arm target --skill <iteration>/skill-snapshot --trials 2 \
  --model <production-model> --effort <production-effort>
node $S run --evals <skill>/evals/evals.json --out <iteration> --set visible \
  --arm no_skill --trials 2 --model <production-model> --effort <production-effort>
node $S trigger --queries <skill>/evals/trigger-evals.json --set visible \
  --fixture <skill>/evals/files/<fixture> --skill <iteration>/skill-snapshot \
  --out <iteration>/trigger --trials 3
node $S grade --out <iteration>
node $S aggregate --out <iteration>
```

The runner gives no sandbox. Trials run with bypassed permissions and the
caller's environment, and only the trial repository is checked for changes.
Use it for output-only targets and for local mutation inside the trial
repository; give external-effecting targets mocks.

The runner retries a trial that ends on an API error, a rate limit, or a
timeout, from a fresh workspace, and keeps every attempt's transcript and
cost. It marks the trial invalid when retries run out. Report retried and
invalid runs; a target that times out is a finding, not only noise. Keep total
concurrency inside the account's rate limit, and interleave arms when latency
matters.

`grade` reads the suite snapshot that the trials ran with and refuses a
changed `--evals`. It runs the deterministic checks, then one grader call per
trial that must return `pass`, `fail`, or `unknown` with evidence for each
assertion by its exact text. `aggregate` counts a grade only for the exact
valid run it graded. It reports pass^k only when every planned trial is
graded.

`timing.json` duration is wall time for the whole session, including
background subagents. Claude Code tokens sum every model's input, output, and
cache traffic in the final result event. Codex tokens cover the root thread
only, with subagent threads listed separately, as
[Codex Metrics](codex-metrics.md) requires. Treat cost as diagnostic: it is
the CLI's own estimate.

## Read the results

- Value over no skill: assertions that pass with the skill and fail without.
  Understand which instruction made the difference.
- Regression checks: assertions that pass in every arm. Keep them, but never
  count them as skill value.
- Suspect tasks: assertions that fail in every arm. Read the transcripts;
  usually the case or the assertion is wrong.
- Flakiness: a case that passes in some trials and fails in others. Tighten
  the instruction the transcripts show the agent reading differently.
- Cost outliers: a trial that takes several times longer than its peers.
  Read its transcript for the wasted work.
- Trigger misses: should-trigger queries where the agent did the job without
  the skill. Compare its behaviour with the skill's process before you widen
  the description.
