# explore-subagents evaluations

Iteration 1 ran on 2026-10-26. It compares the skill with no skill on three
output cases and checks the description against 16 trigger queries. The
fixture `files/tally` is a 16-file TypeScript service with known answers, a
stale README, and an unused legacy HTTP client.

## Setup

| | Claude Code | Codex |
| --- | --- | --- |
| Model | `claude-opus-5-5`, medium effort | `gpt-6.1-sol`, medium effort |
| CLI | Claude Code 2.1.310 | codex-cli 0.164.0 |
| Isolation | `--setting-sources project` | `HOME` set to an empty directory, `--ignore-user-config` |
| Skill arm | `.claude/skills/explore-subagents`, invoked as `/explore-subagents` | `.agents/skills/explore-subagents`, invoked as `$explore-subagents` |
| Trials | 2 per arm and case | 2 per arm and case |

The runner is `optimize-skill/scripts/skill-trials.mjs`. A script
checked file changes and `file:line` citations. `claude-opus-5-5` at low effort
graded the assertions without seeing the arm. The Codex trials still loaded
the owner's global `~/.codex/AGENTS.md`, in both arms.

## Output cases

| Case | Claude, skill | Claude, no skill | Codex, skill | Codex, no skill |
| --- | --- | --- | --- | --- |
| Onboarding: three independent areas | 20/20 | 19/20 | 18/20 | 19/20 |
| Casual request: retry safety | 18/18 | 18/18 | 18/18 | 18/18 |
| Dependent chain: error callers | 14/14 | 14/14 | 14/14 | 14/14 |
| **Mean pass rate** | **1.00** | **0.98** | **0.97** | **0.98** |
| Median wall time | 73 s | 77 s | 81 s | 68 s |
| Median tokens | 277k | 242k | 294k (root) | 400k (root) |

Every arm found the planted facts. Every arm flagged the stale README values
and ignored the dead 30-second legacy client. All but one trial spawned two
to four read-only explorers when the user asked for subagents. Only two
assertions failed anywhere. The 401 refresh path failed once in each Codex
arm. The split between confirmed and inferred claims failed once in the Claude
no-skill arm and once in the Codex skill arm.

Claude subagents with the skill read fewer files that another subagent also
read: a mean of 2.8 against 4.5. This matches the skill's non-overlapping
ownership rule. The sample is six trials on a small fixture, so this is a
direction, not a practical gain.

In one Claude trial of the dependent chain, the skill arm spawned no subagents
and said why: one grep answered the first question. Neither no-skill trial did
this. No with-skill trial ran a separate summary pass; the parent merged the
reports itself.

## Trigger queries

All 8 should-trigger queries invoked the skill in 3 of 3 runs. None of the 8
near-misses invoked it. A first run had a false 2 of 8 because rate-limited
probes counted as "not triggered"; the runner now marks such probes invalid
and retries them.

All should-trigger queries ask for subagents, explorers, or parallel agents in
words. The suite does not test a request with independent questions that does
not ask for agents.

## Conclusion

The skill does what it says, and it triggers when it should. On these cases,
both harnesses already do the same work without it, so it adds no measured
quality. Its cost stays within the noise of two trials. The suite is now
saturated: it can catch a regression, but it cannot show an improvement. It
also has no withheld split yet. A
next iteration needs capability cases from real failures, where the no-skill
arm fails.

Raw transcripts, grades, and benchmarks are in the ignored
`skills/essentials/explore-subagents-workspace/`.
