# optimize-skill evaluations

Iteration 1 ran on 2026-10-26. It asks the skill to design an experiment and
stop before any trial runs, then grades the design. Thus it tests steps 1 to 3
of the skill, not the pilot, the loop, confirmation, or the council.

## Setup

- Arms: `new` (this branch), `old` (`main`), and `no_skill`.
- Executor: `claude-opus-5-5`, medium effort, Claude Code 2.1.310, through
  `scripts/skill-trials.mjs`.
- Trials: 2 per arm and case.
- Grader: `claude-opus-5-5`, low effort. It saw the task, the answer key, and
  the reply, and it did not see the arm.
- Fixture: `files/skills-repo` holds the `main` versions of `explore-subagents`
  and `adversarial-council`. In iteration 1 it also held the council as an
  installed skill under `.claude/skills/`, so the no-skill arm could see the
  council too. The fixture no longer installs it; pass it with `--companion`.
- Checks: no file changed outside `workspace/`, and no subagents were spawned.

## Results

| Case | new | old | no_skill |
| --- | --- | --- | --- |
| Model-invoked target (`explore-subagents`) | 22/22 | 17/22 | 14/22 |
| User-invoked orchestrator (`adversarial-council`) | 18/18 | 18/18 | 16/18 |
| Mean wall time | 199 s | 195 s | 69 s |
| Mean tokens | 294k | 136k | 63k |

The assertions that separate the arms:

| Assertion | new | old | no_skill |
| --- | --- | --- | --- |
| Plans a balanced trigger set with near-misses | 2/2 | 0/2 | 0/2 |
| Repeats trigger queries or holds some out | 2/2 | 0/2 | 0/2 |
| Isolates the no-skill arm from global installs | 2/2 | 1/2 | 0/2 |
| Separates visible from withheld cases (both cases) | 4/4 | 4/4 | 0/4 |

All arms planned a no-skill arm. The `old` arm planned one although the `main`
skill does not ask for it, so that assertion does not measure the change. Both
skill arms correctly planned no trigger set for the user-invoked council.

## Limits

- The same session wrote the new skill text and these assertions. The
  assertions come from the published guidance, but they reward the features
  that the change added. Treat the result as evidence that the new text is
  followed, not that it gives better experiments.
- The cases test the design only. No trial executed a full experiment.
- Two cases and two trials per arm: no withheld cases exist for this suite.
- The new arm used about twice the tokens of the old arm, because it reads
  three references instead of two.
- One assertion accepts repeated trigger queries *or* a held-out split, but
  the skill requires both.

## Independent review

After iteration 1, `gpt-6-astra` (high effort, read-only Codex CLI) reviewed
the change and reported 17 defects. These are fixed:

- Cases are split before the pilot, and only visible cases are piloted.
- The owner sees visible outputs before a finalist is frozen.
- An efficiency target can count as value.
- Executors may write inside their own trial copy.
- The runner:
  - checks `.claude/` and `.agents/` for edits;
  - keeps every attempt's transcript and cost;
  - keeps declared output files for the grader;
  - grades against the run's suite snapshot;
  - validates grader output by assertion text;
  - times out graders and kills whole process groups;
  - classifies Codex workers by `source.subagent`;
  - detects direct `SKILL.md` reads as triggers, and saves trigger transcripts;
  - never turns unknown cost into zero;
  - reports pass^k only for complete trials;
  - installs companions in skill arms only.

These remain open:

- The runner gives no sandbox. The skill and `eval-suite.md` now state that
  limit.
- Trigger probes stop after three non-`Skill` tool calls. A skill that loads
  later is missed.
- This suite tests only the design steps. It needs cases with supplied
  transcripts and ledgers that have known correct decisions: false passes,
  missing trials, leakage, and hard-gate rejection.

## Iteration 2

Iteration 2 reran the fixed `new` arm, with the council passed as a
companion, and a clean `no_skill` arm. The setup was otherwise the same.

| Case | new | no_skill |
| --- | --- | --- |
| Model-invoked target | 22/22 | 15/22 |
| User-invoked orchestrator | 17/18 | 17/18 |

The edits after the review caused no regression on the model-invoked case.
The one `new` failure is fair: the agent reported that the runner's grader
sees subagent briefs, so an arm that delegates is not blind. The runner now
lets a case hide the briefs with `"briefs": false`.

To rerun:

```sh
S=skills/essentials/optimize-skill/scripts/skill-trials.mjs
node $S run --evals skills/essentials/optimize-skill/evals/evals.json \
  --out <iteration> --arm new --skill <snapshot>/optimize-skill \
  --companion skills/essentials/adversarial-council --trials 2
```

Raw outputs are in the ignored `skills/essentials/optimize-skill-workspace/`.
