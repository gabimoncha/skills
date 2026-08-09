#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants as fsConstants, openAsBlob } from "node:fs";
import {
  access,
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import process from "node:process";

const ENDPOINT = "https://chatgpt.com/backend-api/transcribe";
const DEFAULT_BITRATE = "32k";
const DEFAULT_CHUNK_SECONDS = 20 * 60;
const MAX_ALLOWED_CHUNK_SECONDS = 23 * 60;
const REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

function usage() {
  console.error(
    [
      "Usage:",
      "  codex-transcribe.mjs [OPTIONS] AUDIO [AUDIO ...]",
      "",
      "Options:",
      "  --language CODE         Hint the spoken language",
      "  --bitrate RATE          Opus bitrate; default: 32k",
      "  --chunk-minutes NUMBER  Chunk duration; default: 20, maximum: 23",
      "  --force                 Replace existing transcript artifacts",
      "  -h, --help              Show this help",
      "",
      "Each input is converted to mono WebM/Opus chunks, each chunk is uploaded",
      "in one request, and the combined transcript is written beside the source",
      "as NAME.transcript.txt.",
      "",
      "This uses Codex's existing ChatGPT login and an unsupported private endpoint.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const options = {
    bitrate: DEFAULT_BITRATE,
    chunkSeconds: DEFAULT_CHUNK_SECONDS,
    force: false,
    language: null,
    inputs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      argument === "--language" ||
      argument === "--bitrate" ||
      argument === "--chunk-minutes"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${argument}`);
      }
      if (argument === "--chunk-minutes") {
        const minutes = Number(value);
        if (!Number.isFinite(minutes) || minutes <= 0) {
          throw new Error(`Invalid chunk duration: ${value}`);
        }
        options.chunkSeconds = Math.round(minutes * 60);
      } else {
        options[argument.slice(2)] = value;
      }
      index += 1;
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.inputs.push(resolve(argument));
    }
  }

  if (options.inputs.length === 0) {
    usage();
    process.exit(2);
  }

  if (!/^\d+(?:\.\d+)?k$/u.test(options.bitrate)) {
    throw new Error(`Invalid bitrate: ${options.bitrate}`);
  }

  if (options.chunkSeconds > MAX_ALLOWED_CHUNK_SECONDS) {
    throw new Error(
      `Chunk duration must not exceed ${MAX_ALLOWED_CHUNK_SECONDS / 60} minutes; the private backend failed above approximately 23 minutes.`,
    );
  }

  return options;
}

function transcriptPaths(input) {
  const extension = extname(input);
  const stem = basename(input, extension);
  const directory = dirname(input);
  return {
    partial: join(directory, `${stem}.transcript.partial.txt`),
    transcript: join(directory, `${stem}.transcript.txt`),
  };
}

async function pathExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function assertOutputsAvailable(paths, force) {
  if (force) return;

  const collisions = [];
  if (await pathExists(paths.transcript)) collisions.push(paths.transcript);
  if (await pathExists(paths.partial)) collisions.push(paths.partial);

  if (collisions.length > 0) {
    throw new Error(
      `Refusing to replace existing transcript artifact${collisions.length === 1 ? "" : "s"}:\n${collisions.join("\n")}\nPass --force only when replacement is intended.`,
    );
  }
}

async function run(command, args, { capture = false } = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const stdout = [];
    const child = spawn(command, args, {
      stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
    });
    if (capture) {
      child.stdout.on("data", (chunk) => stdout.push(chunk));
    }
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise(capture ? Buffer.concat(stdout).toString("utf8") : "");
      } else {
        rejectPromise(
          new Error(
            `${command} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
          ),
        );
      }
    });
  });
}

async function getDurationSeconds(input) {
  await access(input, fsConstants.R_OK);
  const output = await run(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      input,
    ],
    { capture: true },
  );
  const duration = Number(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine audio duration: ${input}`);
  }
  return duration;
}

async function convertChunk(input, output, bitrate, start, duration) {
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-stats",
    "-y",
    "-ss",
    String(start),
    "-i",
    input,
    "-map",
    "0:a:0",
    "-vn",
    "-t",
    String(duration),
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "libopus",
    "-b:a",
    bitrate,
    "-vbr",
    "on",
    "-compression_level",
    "10",
    "-application",
    "voip",
    output,
  ]);
}

function decodeAccountId(accessToken) {
  const segments = accessToken.split(".");
  if (segments.length < 2) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(segments[1], "base64url").toString("utf8"),
    );
    const auth = payload["https://api.openai.com/auth"];
    return typeof auth?.chatgpt_account_id === "string"
      ? auth.chatgpt_account_id
      : null;
  } catch {
    return null;
  }
}

async function loadAuth() {
  const codexHome =
    process.env.CODEX_HOME ||
    (process.env.HOME ? join(process.env.HOME, ".codex") : null);
  if (!codexHome) {
    throw new Error("Could not resolve CODEX_HOME or HOME.");
  }

  const authPath = join(codexHome, "auth.json");
  let auth;
  try {
    auth = JSON.parse(await readFile(authPath, "utf8"));
  } catch {
    throw new Error(
      `Could not read Codex authentication from ${authPath}. Run "codex login" and retry.`,
    );
  }

  const accessToken = auth?.tokens?.access_token;
  const accountId =
    auth?.tokens?.account_id ??
    auth?.account_id ??
    (typeof accessToken === "string" ? decodeAccountId(accessToken) : null);

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(
      `No ChatGPT access token was found in ${authPath}. Run "codex login" and retry.`,
    );
  }

  return { accessToken, accountId };
}

async function transcribe(audioPath, language, auth) {
  const audio = await openAsBlob(audioPath, { type: "audio/webm" });
  const form = new FormData();
  form.append("file", audio, basename(audioPath));
  if (language) form.append("language", language);

  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
    originator: "Codex Desktop",
    "User-Agent": `Codex Desktop/private-transcription-helper (${process.platform}; ${process.arch})`,
  };
  if (auth.accountId) headers["ChatGPT-Account-Id"] = auth.accountId;

  const startedAt = performance.now();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  const rawBody = await response.text();

  if (!response.ok) {
    let detail = rawBody.slice(0, 500);
    try {
      const parsed = JSON.parse(rawBody);
      detail =
        parsed?.detail?.message ??
        parsed?.detail ??
        parsed?.error?.message ??
        parsed?.error ??
        detail;
    } catch {
      // Keep the bounded response text.
    }
    throw new Error(
      `Transcription failed with HTTP ${response.status} after ${elapsedSeconds}s: ${String(detail)}`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error(
      `Transcription returned HTTP ${response.status} but not JSON after ${elapsedSeconds}s`,
    );
  }

  if (typeof parsed?.text !== "string") {
    throw new Error(
      `Transcription returned HTTP ${response.status} without a text field after ${elapsedSeconds}s`,
    );
  }

  return { text: parsed.text.trim(), elapsedSeconds };
}

async function writePrivateFile(path, contents) {
  await writeFile(path, contents, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
}

async function transcribeInput(input, options, auth) {
  const paths = transcriptPaths(input);
  const duration = await getDurationSeconds(input);
  const chunkCount = Math.ceil(duration / options.chunkSeconds);
  const tempDirectory = await mkdtemp(join(tmpdir(), "codex-transcribe-"));
  const transcripts = [];

  console.log(
    `${basename(input)}: ${duration.toFixed(1)}s, ${chunkCount} chunk${chunkCount === 1 ? "" : "s"} of at most ${(options.chunkSeconds / 60).toFixed(2)} minutes`,
  );

  try {
    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * options.chunkSeconds;
      const chunkDuration = Math.min(options.chunkSeconds, duration - start);
      const chunkNumber = index + 1;
      const chunkPath = join(
        tempDirectory,
        `part-${String(chunkNumber).padStart(3, "0")}.webm`,
      );

      console.log(
        `Converting chunk ${chunkNumber}/${chunkCount}: ${start.toFixed(1)}s–${(start + chunkDuration).toFixed(1)}s`,
      );
      await convertChunk(
        input,
        chunkPath,
        options.bitrate,
        start,
        chunkDuration,
      );

      const chunkStat = await stat(chunkPath);
      console.log(
        `Uploading chunk ${chunkNumber}/${chunkCount} as one request (${(chunkStat.size / 1_000_000).toFixed(2)} MB)`,
      );
      const result = await transcribe(chunkPath, options.language, auth);
      transcripts.push(result.text);
      await writePrivateFile(
        paths.partial,
        `${transcripts.filter(Boolean).join("\n\n")}\n`,
      );
      console.log(
        `Chunk ${chunkNumber}/${chunkCount} succeeded in ${result.elapsedSeconds}s (${result.text.length} characters)`,
      );
    }

    const combined = transcripts.filter(Boolean).join("\n\n");
    await writePrivateFile(paths.transcript, `${combined}\n`);
    await rm(paths.partial, { force: true });
    console.log(
      `Complete: ${paths.transcript} (${combined.length} characters)`,
    );
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const transcriptTargets = new Map();

  for (const input of options.inputs) {
    const paths = transcriptPaths(input);
    const previousInput = transcriptTargets.get(paths.transcript);
    if (previousInput) {
      throw new Error(
        `Inputs resolve to the same transcript path:\n${previousInput}\n${input}\n${paths.transcript}`,
      );
    }
    transcriptTargets.set(paths.transcript, input);
    await assertOutputsAvailable(paths, options.force);
  }

  const auth = await loadAuth();

  for (const input of options.inputs) {
    await transcribeInput(input, options, auth);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
