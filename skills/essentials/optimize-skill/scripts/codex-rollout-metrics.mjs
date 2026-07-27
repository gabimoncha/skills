#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "codex-rollout-metrics/v1";
const TOKEN_FIELDS = [
  "input_tokens",
  "cached_input_tokens",
  "cache_write_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
];

export class RolloutInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "RolloutInputError";
  }
}

function zeroVector() {
  return Object.fromEntries(TOKEN_FIELDS.map((field) => [field, 0]));
}

function validateTokenRelationships(vector, line, label = "") {
  const prefix = label ? `${label} ` : "";
  if (vector.total_tokens !== vector.input_tokens + vector.output_tokens) {
    throw new RolloutInputError(
      `Line ${line}: ${prefix}total_tokens must equal input_tokens + output_tokens.`,
    );
  }
  if (vector.cached_input_tokens > vector.input_tokens) {
    throw new RolloutInputError(
      `Line ${line}: ${prefix}cached_input_tokens exceeds input_tokens.`,
    );
  }
  if (vector.reasoning_output_tokens > vector.output_tokens) {
    throw new RolloutInputError(
      `Line ${line}: ${prefix}reasoning_output_tokens exceeds output_tokens.`,
    );
  }
}

function validateTokenVector(value, line) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RolloutInputError(
      `Line ${line}: missing total_token_usage object.`,
    );
  }

  const vector = {};
  for (const field of TOKEN_FIELDS) {
    const metric = value[field];
    if (!Number.isSafeInteger(metric) || metric < 0) {
      throw new RolloutInputError(
        `Line ${line}: ${field} must be a non-negative safe integer.`,
      );
    }
    vector[field] = metric;
  }

  validateTokenRelationships(vector, line);

  return vector;
}

function subtractVectors(terminal, baseline, line) {
  const delta = {};
  for (const field of TOKEN_FIELDS) {
    const value = terminal[field] - baseline[field];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RolloutInputError(
        `Line ${line}: cumulative ${field} decreased.`,
      );
    }
    delta[field] = value;
  }

  validateTokenRelationships(delta, line, "derived");

  return delta;
}

function parseJsonLines(text) {
  const records = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim()) continue;

    try {
      records.push({ line: index + 1, value: JSON.parse(raw) });
    } catch {
      throw new RolloutInputError(`Line ${index + 1}: malformed JSONL.`);
    }
  }

  if (records.length === 0) {
    throw new RolloutInputError("Rollout is empty.");
  }

  return records;
}

function sourceKind(meta) {
  if (!meta.parent_thread_id) return "root";
  const subagent = meta.source?.subagent;
  if (!subagent || typeof subagent !== "object") return "subagent";
  if (subagent.thread_spawn) return "thread_spawn";
  if (subagent.guardian) return "guardian";
  return Object.keys(subagent)[0] ?? "subagent";
}

function timingFromComplete(payload, line) {
  const duration = payload.duration_ms;
  if (duration === undefined || duration === null) {
    return {
      status: "unavailable",
      reason: "task_complete lacks duration_ms",
      provenance: { line },
    };
  }
  if (!Number.isSafeInteger(duration) || duration < 0) {
    throw new RolloutInputError(
      `Line ${line}: duration_ms must be a non-negative safe integer.`,
    );
  }

  let timeToFirstToken = payload.time_to_first_token_ms ?? null;
  if (
    timeToFirstToken !== null &&
    (!Number.isSafeInteger(timeToFirstToken) ||
      timeToFirstToken < 0 ||
      timeToFirstToken > duration)
  ) {
    throw new RolloutInputError(
      `Line ${line}: time_to_first_token_ms must be between zero and duration_ms.`,
    );
  }

  let startedAt = payload.started_at ?? null;
  let completedAt = payload.completed_at ?? null;
  for (const [field, value] of [
    ["started_at", startedAt],
    ["completed_at", completedAt],
  ]) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
      throw new RolloutInputError(
        `Line ${line}: ${field} must be a non-negative safe integer.`,
      );
    }
  }
  if (
    startedAt !== null &&
    completedAt !== null &&
    completedAt < startedAt
  ) {
    throw new RolloutInputError(
      `Line ${line}: completed_at precedes started_at.`,
    );
  }

  return {
    status: "exact",
    duration_ms: duration,
    time_to_first_token_ms: timeToFirstToken,
    started_at_unix_s: startedAt,
    completed_at_unix_s: completedAt,
    provenance: {
      event_type: "event_msg/task_complete",
      line,
    },
  };
}

function usageUnavailable(reason) {
  return {
    status: "unavailable",
    scope: "thread_turn",
    reason,
  };
}

function outputStatus(turns) {
  if (turns.length === 0) return "unavailable";
  const complete = turns.every(
    (turn) =>
      turn.state === "complete" &&
      turn.usage.status === "exact" &&
      turn.timing.status === "exact",
  );
  return complete ? "complete" : "partial";
}

export function parseRolloutText(
  text,
  { rolloutOrdinal = null, turnId = null } = {},
) {
  const records = parseJsonLines(text);
  const metadata = records.filter(
    ({ value }) => value.type === "session_meta",
  );
  if (metadata.length === 0) {
    throw new RolloutInputError("Missing session_meta.");
  }

  const meta = metadata[0].value.payload ?? {};
  if (typeof meta.id !== "string" || !meta.id) {
    throw new RolloutInputError("session_meta.payload.id is missing.");
  }
  for (const entry of metadata.slice(1)) {
    if (entry.value.payload?.id !== meta.id) {
      throw new RolloutInputError(
        `Line ${entry.line}: inconsistent session_meta id.`,
      );
    }
  }

  const turns = [];
  const turnsById = new Map();
  let currentTurn = null;
  let firstTaskStartLine = null;
  let firstTokenLine = null;
  let latestCumulative = null;
  let priorCompletedEndpoint = null;
  let priorCompletedLine = null;
  let completedBaselineUnavailable = false;

  for (const record of records) {
    const { line, value } = record;
    const payload = value.payload ?? {};

    if (value.type === "event_msg" && payload.type === "task_started") {
      const id = payload.turn_id;
      if (typeof id !== "string" || !id) {
        throw new RolloutInputError(
          `Line ${line}: task_started lacks turn_id.`,
        );
      }
      if (currentTurn && currentTurn.state === "open") {
        throw new RolloutInputError(
          `Line ${line}: a new turn started before ${currentTurn.turn_id} completed.`,
        );
      }
      if (turnsById.has(id)) {
        throw new RolloutInputError(`Line ${line}: duplicate turn ${id}.`);
      }

      currentTurn = {
        turn_id: id,
        state: "open",
        started_line: line,
        started_at_unix_s:
          Number.isSafeInteger(payload.started_at) && payload.started_at >= 0
            ? payload.started_at
            : null,
        model_context_window:
          Number.isSafeInteger(payload.model_context_window) &&
          payload.model_context_window > 0
            ? payload.model_context_window
            : null,
        config: {
          model: null,
          reasoning_effort: null,
        },
        last_token: null,
        usage: usageUnavailable("turn has no token_count event"),
        timing: {
          status: "unavailable",
          reason: "turn is open",
        },
        warnings: [],
      };
      if (firstTaskStartLine === null) firstTaskStartLine = line;
      turns.push(currentTurn);
      turnsById.set(id, currentTurn);
      continue;
    }

    if (value.type === "turn_context") {
      const turn = turnsById.get(payload.turn_id);
      if (turn) {
        turn.config = {
          model:
            typeof payload.model === "string" && payload.model
              ? payload.model
              : null,
          reasoning_effort:
            typeof (payload.effort ?? payload.reasoning_effort) === "string"
              ? (payload.effort ?? payload.reasoning_effort)
              : null,
        };
      }
      continue;
    }

    if (value.type === "event_msg" && payload.type === "token_count") {
      if (firstTokenLine === null) firstTokenLine = line;
      const cumulative = validateTokenVector(
        payload.info?.total_token_usage,
        line,
      );
      if (latestCumulative) {
        subtractVectors(cumulative, latestCumulative.vector, line);
      }
      latestCumulative = { vector: cumulative, line };
      if (currentTurn) {
        currentTurn.last_token = latestCumulative;
      } else if (
        firstTaskStartLine !== null &&
        (priorCompletedEndpoint === null ||
          TOKEN_FIELDS.some(
            (field) => cumulative[field] !== priorCompletedEndpoint[field],
          ))
      ) {
        completedBaselineUnavailable = true;
      }
      continue;
    }

    if (value.type === "event_msg" && payload.type === "task_complete") {
      const turn = turnsById.get(payload.turn_id);
      if (!turn) {
        throw new RolloutInputError(
          `Line ${line}: task_complete refers to an unknown turn.`,
        );
      }
      if (turn.state === "complete") {
        throw new RolloutInputError(
          `Line ${line}: duplicate task_complete for ${turn.turn_id}.`,
        );
      }

      turn.state = "complete";
      turn.timing = timingFromComplete(payload, line);

      if (!turn.last_token) {
        turn.usage = usageUnavailable(
          "completed turn has no token_count endpoint",
        );
        completedBaselineUnavailable = true;
      } else if (
        priorCompletedEndpoint === null &&
        firstTokenLine !== null &&
        firstTaskStartLine !== null &&
        firstTokenLine < firstTaskStartLine
      ) {
        turn.usage = usageUnavailable(
          "first cumulative baseline predates the first task_started event",
        );
        completedBaselineUnavailable = true;
      } else if (completedBaselineUnavailable) {
        turn.usage = usageUnavailable(
          "a prior completed turn has no trustworthy cumulative endpoint",
        );
      } else {
        const baseline = priorCompletedEndpoint ?? zeroVector();
        const delta = subtractVectors(
          turn.last_token.vector,
          baseline,
          turn.last_token.line,
        );
        turn.usage = {
          status: "exact",
          scope: "thread_turn",
          ...delta,
          derivation:
            priorCompletedEndpoint === null
              ? "terminal cumulative endpoint minus zero first-turn baseline"
              : "terminal cumulative endpoint minus prior completed-turn endpoint",
          cumulative_endpoint: turn.last_token.vector,
          prior_cumulative_endpoint: baseline,
          provenance: {
            event_type: "event_msg/token_count",
            baseline_line: priorCompletedLine,
            terminal_line: turn.last_token.line,
            json_pointer: "/payload/info/total_token_usage",
          },
        };
        priorCompletedEndpoint = turn.last_token.vector;
        priorCompletedLine = turn.last_token.line;
      }

      if (currentTurn?.turn_id === turn.turn_id) currentTurn = null;
    }
  }

  for (const turn of turns) {
    if (turn.state !== "open") continue;
    if (!turn.last_token) {
      turn.usage = usageUnavailable("open turn has no observed token_count");
      continue;
    }
    if (completedBaselineUnavailable) {
      turn.usage = usageUnavailable(
        "a prior completed turn has no trustworthy cumulative endpoint",
      );
      continue;
    }
    if (
      priorCompletedEndpoint === null &&
      firstTokenLine !== null &&
      firstTaskStartLine !== null &&
      firstTokenLine < firstTaskStartLine
    ) {
      turn.usage = usageUnavailable(
        "open turn cumulative baseline is unavailable",
      );
      continue;
    }

    const baseline = priorCompletedEndpoint ?? zeroVector();
    const delta = subtractVectors(
      turn.last_token.vector,
      baseline,
      turn.last_token.line,
    );
    turn.usage = {
      status: "partial",
      scope: "thread_turn",
      ...delta,
      derivation: "observed cumulative endpoint minus prior completed endpoint",
      cumulative_endpoint: turn.last_token.vector,
      prior_cumulative_endpoint: baseline,
      provenance: {
        event_type: "event_msg/token_count",
        baseline_line: priorCompletedLine,
        terminal_line: turn.last_token.line,
        json_pointer: "/payload/info/total_token_usage",
      },
    };
  }

  const selectedTurns = turnId
    ? turns.filter((turn) => turn.turn_id === turnId)
    : turns;
  if (turnId && selectedTurns.length === 0) {
    throw new RolloutInputError(`Turn ${turnId} was not found.`);
  }

  const publicTurns = selectedTurns.map((turn) => ({
    turn_id: turn.turn_id,
    state: turn.state,
    config: {
      model: turn.config.model,
      reasoning_effort: turn.config.reasoning_effort,
      model_context_window: turn.model_context_window,
    },
    usage: turn.usage,
    timing: turn.timing,
    warnings: turn.warnings,
  }));
  const status = outputStatus(publicTurns);

  return {
    status,
    provenance: {
      rollout_input:
        Number.isSafeInteger(rolloutOrdinal) && rolloutOrdinal > 0
          ? rolloutOrdinal
          : null,
      format: "codex-rollout-jsonl",
      support_level: "observed_undocumented",
      extraction_schema: SCHEMA_VERSION,
      cli_version:
        typeof meta.cli_version === "string" ? meta.cli_version : null,
      model_provider:
        typeof meta.model_provider === "string" ? meta.model_provider : null,
    },
    thread: {
      thread_id: meta.id,
      parent_thread_id:
        typeof meta.parent_thread_id === "string"
          ? meta.parent_thread_id
          : null,
      source_kind: sourceKind(meta),
    },
    turns: publicTurns,
    warnings: [
      "Token fields overlap: cached input is within input; reasoning output is within output.",
      "This record is not additive with ancestor or descendant thread records.",
    ],
  };
}

function parseArguments(argv) {
  const options = {
    rollouts: [],
    turnId: null,
    pretty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--rollout") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new RolloutInputError("--rollout requires a path.");
      }
      options.rollouts.push(value);
      index += 1;
    } else if (argument === "--turn") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new RolloutInputError("--turn requires an id.");
      }
      if (options.turnId) {
        throw new RolloutInputError("--turn may be supplied only once.");
      }
      options.turnId = value;
      index += 1;
    } else if (argument === "--pretty") {
      options.pretty = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new RolloutInputError(`Unknown argument: ${argument}`);
    }
  }

  if (!options.help && options.rollouts.length === 0) {
    throw new RolloutInputError("At least one --rollout path is required.");
  }
  return options;
}

function overallStatus(records) {
  if (records.every((record) => record.status === "complete")) return "complete";
  if (records.every((record) => record.status === "unavailable")) {
    return "unavailable";
  }
  return "partial";
}

function helpText() {
  return [
    "Usage:",
    "  node codex-rollout-metrics.mjs --rollout <path> [--rollout <path> ...]",
    "    [--turn <turn-id>] [--pretty]",
    "",
    "Reads explicit Codex rollout JSONL files and emits allowlisted per-turn",
    "token and timing metrics. It never discovers or combines sessions.",
  ].join("\n");
}

export async function runCli(
  argv,
  {
    stdout = (value) => process.stdout.write(value),
    stderr = (value) => process.stderr.write(value),
  } = {},
) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    if (error instanceof RolloutInputError) {
      stderr(`${error.message}\n`);
      return 2;
    }
    throw error;
  }

  if (options.help) {
    stdout(`${helpText()}\n`);
    return 0;
  }

  try {
    const records = [];
    for (const [index, rollout] of options.rollouts.entries()) {
      let text;
      try {
        text = await readFile(rollout, "utf8");
      } catch {
        throw new RolloutInputError(
          `Unable to read explicit rollout input ${index + 1}.`,
        );
      }
      records.push(
        parseRolloutText(text, {
          rolloutOrdinal: index + 1,
          turnId: options.turnId,
        }),
      );
    }

    const result = {
      schema_version: SCHEMA_VERSION,
      status: overallStatus(records),
      records,
      aggregates: {
        root_plus_descendants: {
          status: "unavailable",
          reason: "ancestor-descendant accounting is not a stable contract",
        },
      },
    };
    stdout(`${JSON.stringify(result, null, options.pretty ? 2 : 0)}\n`);
    return result.status === "complete" ? 0 : 3;
  } catch (error) {
    if (error instanceof RolloutInputError) {
      stderr(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
