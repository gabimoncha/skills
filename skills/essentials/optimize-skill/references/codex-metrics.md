# Codex Metrics

Read this reference before using Codex rollout telemetry in a comparison. The
persisted JSONL format is an observed, undocumented interface and may change.
Fail closed when required token or timing structures and recognized invariants
drift. Missing comparison provenance may remain `null`, but makes the affected
cross-run comparison non-decisive.

## Use the helper

Pass explicit rollout files only:

```sh
node scripts/codex-rollout-metrics.mjs \
  --rollout /absolute/path/to/rollout.jsonl \
  --pretty
```

Select one turn from each supplied file when needed:

```sh
node scripts/codex-rollout-metrics.mjs \
  --rollout /absolute/path/to/rollout.jsonl \
  --turn <turn-id>
```

Repeat `--rollout` to return separate records. The helper never discovers,
combines, uploads, or mutates sessions.

Exit codes:

- `0`: all requested metrics are complete;
- `2`: invalid input, unreadable file, malformed data, or unsupported schema;
- `3`: valid allowlisted output contains partial or unavailable metrics;
- `1`: unexpected helper failure.

## Interpret token fields

`token_count.info.total_token_usage` is cumulative for a thread and can span
resumed turns. For a completed turn, subtract the previous completed turn's
cumulative endpoint from the terminal endpoint immediately before
`task_complete`.

- `total_tokens = input_tokens + output_tokens`
- `cached_input_tokens` is a subset of input, not an extra quantity.
- `reasoning_output_tokens` is a subset of output, not an extra quantity.
- Repeated identical cumulative events are harmless.
- A changed cumulative event outside an open turn makes later per-turn
  attribution unavailable.
- Never sum `last_token_usage` events.
- A decrease, negative value, non-integer, inconsistent identity, or malformed
  line invalidates the affected rollout.
- Derived deltas must preserve the same cached-input and reasoning-output
  subset relationships as cumulative endpoints.

Root and worker records are separate accounting scopes. Do not add an ancestor
to descendants or call the result campaign cost: inclusion behavior is not a
stable documented contract. Aggregate only independently selected, comparable
worker records outside this helper.

The active orchestrator's terminal metrics do not exist until its turn ends.
During the same turn, report completed worker metrics and separately labeled
orchestrator-observed elapsed time. Obtain exact root terminal metrics only in
later post-processing.

## Interpret time fields

`task_complete.duration_ms` and `time_to_first_token_ms` describe one completed
turn. Keep these scopes distinct:

- turn duration: wall time for that thread turn;
- worker duration sum: agent-time, which double-counts overlap;
- worker span: earliest worker start to latest worker completion;
- experiment wall time: parent-observed elapsed time.

Parallelism can lower wall time while increasing agent-time. Do not exchange
one label for another.

## Compare matched records

Treat token or latency evidence as decisive only when these match or the
mismatch is disclosed:

- provider, model, effort, context window, and rollout/CLI format;
- task and evaluated skill hashes;
- system role and base-instruction surface;
- repo fixture and dirty-state fixture;
- sandbox, network, tools, permissions, and output budget;
- turn position, concurrency policy, and retry/completion count;
- cache ratio and service tier when observable.

If required comparison provenance such as provider, model, effort, or context
is absent, the local metric may still be exact for its thread turn, but it
cannot decide a cross-run efficiency claim.

Interleave randomized conditions and compare replicated medians and ranges.
Fresh threads are not necessarily cold-cache runs. Total tokens measure
processed volume, not money; monetary cost needs separately pinned pricing and
complete billing semantics.

## Protect private sessions

Rollouts can contain prompts, responses, base instructions, local paths,
repository URLs, tool output, identities, and secrets. The helper emits only an
allowlist of identifiers, version provenance, token vectors, timing, line
locators, status, and invariant warnings.

Do not delegate or commit raw rollouts. Use aggregate metrics and minimal
synthetic/redacted benchmark cases. If redaction destroys validity, stop and
request authorization for the exact disclosure.

## Measure static skill size

When useful, report UTF-8 bytes, line count, and a declared whitespace-word
count for the frozen skill bundle. Do not call these tokens. Runtime rollout
metrics, rather than a new tokenizer dependency, supply actual token usage.
