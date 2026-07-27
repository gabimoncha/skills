import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RolloutInputError,
  parseRolloutText,
  runCli,
} from "./codex-rollout-metrics.mjs";

function jsonl(records) {
  return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

function meta(overrides = {}) {
  return {
    timestamp: "2026-07-25T00:00:00.000Z",
    type: "session_meta",
    payload: {
      id: "thread-root",
      cli_version: "0.test",
      model_provider: "openai",
      ...overrides,
    },
  };
}

function started(turnId, startedAt = 1) {
  return {
    timestamp: "2026-07-25T00:00:01.000Z",
    type: "event_msg",
    payload: {
      type: "task_started",
      turn_id: turnId,
      started_at: startedAt,
      model_context_window: 258400,
    },
  };
}

function context(turnId) {
  return {
    timestamp: "2026-07-25T00:00:02.000Z",
    type: "turn_context",
    payload: {
      turn_id: turnId,
      model: "gpt-test",
      effort: "low",
      cwd: "/PRIVATE/SHOULD_NOT_LEAK",
    },
  };
}

function tokens(vector) {
  return {
    timestamp: "2026-07-25T00:00:03.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: vector,
      },
    },
  };
}

function complete(
  turnId,
  { duration = 35131, ttft = 7275, startedAt = 1, completedAt = 36 } = {},
) {
  return {
    timestamp: "2026-07-25T00:00:36.000Z",
    type: "event_msg",
    payload: {
      type: "task_complete",
      turn_id: turnId,
      duration_ms: duration,
      time_to_first_token_ms: ttft,
      started_at: startedAt,
      completed_at: completedAt,
      last_agent_message: "PRIVATE_MESSAGE_SHOULD_NOT_LEAK",
    },
  };
}

function vector({
  input,
  cached,
  output,
  reasoning,
  cacheWrite = 0,
}) {
  return {
    input_tokens: input,
    cached_input_tokens: cached,
    cache_write_input_tokens: cacheWrite,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: input + output,
  };
}

test("extracts exact single-turn worker metrics without leaking raw content", () => {
  const sample = jsonl([
    meta({
      id: "thread-child",
      parent_thread_id: "thread-root",
      source: { subagent: { thread_spawn: {} } },
    }),
    started("turn-child"),
    context("turn-child"),
    {
      type: "response_item",
      payload: { text: "PRIVATE_RESPONSE_SHOULD_NOT_LEAK" },
    },
    tokens(
      vector({
        input: 143682,
        cached: 137984,
        output: 1415,
        reasoning: 402,
      }),
    ),
    complete("turn-child"),
  ]);

  const result = parseRolloutText(sample, {
    rolloutOrdinal: 1,
  });
  assert.equal(result.status, "complete");
  assert.equal(result.provenance.rollout_input, 1);
  assert.equal(result.thread.source_kind, "thread_spawn");
  assert.equal(result.turns[0].usage.total_tokens, 145097);
  assert.equal(result.turns[0].usage.cached_input_tokens, 137984);
  assert.equal(result.turns[0].usage.reasoning_output_tokens, 402);
  assert.equal(result.turns[0].timing.duration_ms, 35131);
  assert.equal(result.turns[0].timing.time_to_first_token_ms, 7275);

  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("PRIVATE_"));
  assert.ok(!serialized.includes("/private/secret"));
  assert.ok(!serialized.includes("rollout-child.jsonl"));
  assert.ok(!serialized.includes("cwd"));
  assert.ok(!serialized.includes("last_agent_message"));
});

test("derives resumed-turn usage from cumulative endpoints and ignores duplicates", () => {
  const first = vector({
    input: 22400000,
    cached: 22000000,
    output: 115822,
    reasoning: 20000,
  });
  const second = vector({
    input: 23000000,
    cached: 22500000,
    output: 121330,
    reasoning: 22000,
  });
  const third = vector({
    input: 25400000,
    cached: 24900000,
    output: 176630,
    reasoning: 30000,
  });
  const sample = jsonl([
    meta(),
    started("turn-1", 1),
    tokens(first),
    tokens(first),
    complete("turn-1", { duration: 1831848 }),
    started("turn-2", 2),
    tokens(second),
    complete("turn-2", { duration: 30315 }),
    started("turn-3", 3),
    tokens(third),
    complete("turn-3", { duration: 571816 }),
  ]);

  const result = parseRolloutText(sample);
  assert.deepEqual(
    result.turns.map((turn) => turn.usage.total_tokens),
    [22515822, 605508, 2455300],
  );
  assert.deepEqual(
    result.turns.map((turn) => turn.timing.duration_ms),
    [1831848, 30315, 571816],
  );
  assert.equal(result.turns[2].usage.cumulative_endpoint.total_tokens, 25576630);
});

test("marks an open turn partial and its timing unavailable", () => {
  const sample = jsonl([
    meta(),
    started("turn-open"),
    tokens(
      vector({
        input: 100,
        cached: 80,
        output: 20,
        reasoning: 5,
      }),
    ),
  ]);

  const result = parseRolloutText(sample);
  assert.equal(result.status, "partial");
  assert.equal(result.turns[0].state, "open");
  assert.equal(result.turns[0].usage.status, "partial");
  assert.equal(result.turns[0].timing.status, "unavailable");
});

test("marks a completed turn without token telemetry unavailable", () => {
  const sample = jsonl([meta(), started("turn-no-tokens"), complete("turn-no-tokens")]);
  const result = parseRolloutText(sample);
  assert.equal(result.status, "partial");
  assert.equal(result.turns[0].usage.status, "unavailable");
  assert.equal(result.turns[0].timing.status, "exact");
});

test("does not invent a zero baseline after a completed turn lacks telemetry", () => {
  const sample = jsonl([
    meta(),
    started("turn-no-tokens"),
    complete("turn-no-tokens"),
    started("turn-after-gap"),
    tokens(
      vector({
        input: 180,
        cached: 100,
        output: 20,
        reasoning: 4,
      }),
    ),
    complete("turn-after-gap"),
  ]);

  const result = parseRolloutText(sample);
  assert.equal(result.status, "partial");
  assert.equal(result.turns[1].usage.status, "unavailable");
  assert.match(result.turns[1].usage.reason, /prior completed turn/);
});

test("does not attribute changed out-of-turn telemetry to a later turn", () => {
  const first = vector({
    input: 100,
    cached: 80,
    output: 20,
    reasoning: 5,
  });
  const betweenTurns = vector({
    input: 110,
    cached: 85,
    output: 22,
    reasoning: 6,
  });
  const second = vector({
    input: 200,
    cached: 160,
    output: 40,
    reasoning: 10,
  });
  const sample = jsonl([
    meta(),
    started("turn-1"),
    tokens(first),
    complete("turn-1"),
    tokens(betweenTurns),
    started("turn-2"),
    tokens(second),
    complete("turn-2"),
  ]);

  const result = parseRolloutText(sample);
  assert.equal(result.status, "partial");
  assert.equal(result.turns[0].usage.status, "exact");
  assert.equal(result.turns[1].usage.status, "unavailable");
  assert.match(result.turns[1].usage.reason, /prior completed turn/);
});

test("selects one turn after deriving its cumulative delta", () => {
  const sample = jsonl([
    meta(),
    started("turn-1"),
    tokens(
      vector({
        input: 90,
        cached: 50,
        output: 10,
        reasoning: 2,
      }),
    ),
    complete("turn-1"),
    started("turn-2"),
    tokens(
      vector({
        input: 180,
        cached: 100,
        output: 20,
        reasoning: 4,
      }),
    ),
    complete("turn-2"),
  ]);
  const result = parseRolloutText(sample, { turnId: "turn-2" });
  assert.equal(result.turns.length, 1);
  assert.equal(result.turns[0].usage.total_tokens, 100);
});

test("fails closed on malformed JSON, invalid overlap, and cumulative decrease", () => {
  assert.throws(
    () => parseRolloutText(`${JSON.stringify(meta())}\n{broken\n`),
    RolloutInputError,
  );

  const invalidOverlap = {
    input_tokens: 10,
    cached_input_tokens: 11,
    cache_write_input_tokens: 0,
    output_tokens: 2,
    reasoning_output_tokens: 0,
    total_tokens: 12,
  };
  assert.throws(
    () =>
      parseRolloutText(
        jsonl([meta(), started("turn"), tokens(invalidOverlap), complete("turn")]),
      ),
    /cached_input_tokens exceeds input_tokens/,
  );

  const high = vector({
    input: 100,
    cached: 50,
    output: 10,
    reasoning: 2,
  });
  const low = vector({
    input: 90,
    cached: 40,
    output: 9,
    reasoning: 1,
  });
  assert.throws(
    () =>
      parseRolloutText(
        jsonl([
          meta(),
          started("turn"),
          tokens(high),
          tokens(low),
          complete("turn"),
        ]),
      ),
    /cumulative input_tokens decreased/,
  );
});

test("fails closed when cumulative endpoints yield impossible token subsets", () => {
  const baseline = vector({
    input: 100,
    cached: 0,
    output: 100,
    reasoning: 0,
  });
  const invalidCachedDelta = vector({
    input: 110,
    cached: 100,
    output: 110,
    reasoning: 0,
  });
  assert.throws(
    () =>
      parseRolloutText(
        jsonl([
          meta(),
          started("turn-1"),
          tokens(baseline),
          complete("turn-1"),
          started("turn-2"),
          tokens(invalidCachedDelta),
          complete("turn-2"),
        ]),
      ),
    /derived cached_input_tokens exceeds input_tokens/,
  );

  const invalidReasoningDelta = vector({
    input: 110,
    cached: 0,
    output: 110,
    reasoning: 100,
  });
  assert.throws(
    () =>
      parseRolloutText(
        jsonl([
          meta(),
          started("turn-1"),
          tokens(baseline),
          complete("turn-1"),
          started("turn-2"),
          tokens(invalidReasoningDelta),
          complete("turn-2"),
        ]),
      ),
    /derived reasoning_output_tokens exceeds output_tokens/,
  );
});

test("fails closed on impossible completed-turn timing", () => {
  const usage = tokens(
    vector({
      input: 100,
      cached: 80,
      output: 20,
      reasoning: 5,
    }),
  );
  assert.throws(
    () =>
      parseRolloutText(
        jsonl([
          meta(),
          started("turn"),
          usage,
          complete("turn", { duration: 1, ttft: 2 }),
        ]),
      ),
    /time_to_first_token_ms/,
  );
  assert.throws(
    () =>
      parseRolloutText(
        jsonl([
          meta(),
          started("turn"),
          usage,
          complete("turn", { startedAt: 10, completedAt: 9 }),
        ]),
      ),
    /completed_at precedes started_at/,
  );
});

test("CLI emits separate allowlisted records and exit code 3 for partial data", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rollout-metrics-"));
  const completePath = path.join(directory, "complete.jsonl");
  const partialPath = path.join(directory, "partial.jsonl");
  await writeFile(
    completePath,
    jsonl([
      meta({ id: "complete-thread" }),
      started("complete-turn"),
      tokens(
        vector({
          input: 100,
          cached: 80,
          output: 20,
          reasoning: 5,
        }),
      ),
      complete("complete-turn"),
    ]),
  );
  await writeFile(
    partialPath,
    jsonl([
      meta({ id: "partial-thread" }),
      started("partial-turn"),
      {
        type: "response_item",
        payload: { text: "PRIVATE_CLI_SENTINEL" },
      },
      tokens(
        vector({
          input: 50,
          cached: 40,
          output: 5,
          reasoning: 1,
        }),
      ),
    ]),
  );

  let stdout = "";
  let stderr = "";
  const code = await runCli(
    [
      "--rollout",
      completePath,
      "--rollout",
      partialPath,
      "--pretty",
    ],
    {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
    },
  );

  assert.equal(code, 3);
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.records.length, 2);
  assert.equal(result.status, "partial");
  assert.equal(result.aggregates.root_plus_descendants.status, "unavailable");
  assert.ok(!stdout.includes(directory));
  assert.ok(!stdout.includes("PRIVATE_CLI_SENTINEL"));
});

test("CLI rejects missing explicit input and prints help without reading files", async () => {
  let stdout = "";
  let stderr = "";
  assert.equal(
    await runCli([], {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
    }),
    2,
  );
  assert.match(stderr, /At least one --rollout/);

  stdout = "";
  stderr = "";
  assert.equal(
    await runCli(["--help"], {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
    }),
    0,
  );
  assert.match(stdout, /Usage:/);
  assert.equal(stderr, "");
});

test("CLI does not echo a private unreadable rollout path", async () => {
  let stdout = "";
  let stderr = "";
  const privatePath = path.join(
    os.tmpdir(),
    "PRIVATE-CUSTOMER-NAME",
    "missing.jsonl",
  );
  const code = await runCli(["--rollout", privatePath], {
    stdout: (value) => {
      stdout += value;
    },
    stderr: (value) => {
      stderr += value;
    },
  });

  assert.equal(code, 2);
  assert.equal(stdout, "");
  assert.match(stderr, /rollout input 1/);
  assert.ok(!stderr.includes("PRIVATE-CUSTOMER-NAME"));
  assert.ok(!stderr.includes(privatePath));
});

test("module path remains local to the skill", () => {
  const scriptPath = fileURLToPath(
    new URL("./codex-rollout-metrics.mjs", import.meta.url),
  );
  assert.equal(path.dirname(scriptPath), path.dirname(fileURLToPath(import.meta.url)));
});
