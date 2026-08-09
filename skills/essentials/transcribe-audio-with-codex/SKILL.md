---
name: transcribe-audio-with-codex
description: Transcribe local audio or video quickly through Codex Desktop's existing ChatGPT authentication without launching another app instance or replaying media in real time, then derive grounded summaries and actionable-item files from the completed transcripts. Use when the user wants Codex's first-party transcription path, raw transcript files beside one or more media inputs, safe automatic chunking for long recordings, transcript summaries, decisions, next steps, or ownership gaps. This workflow uses an unsupported private ChatGPT endpoint and must preserve source media, credentials, raw transcripts, partial progress, and requested output boundaries.
---

# Transcribe Audio with Codex

Treat the run as an owned file pipeline:

```text
decodable media
  -> sequential 20-minute mono WebM/Opus chunks
  -> Codex Desktop's private ChatGPT transcription endpoint
  -> raw transcript file
  -> Codex summary and actionable-items files
```

This path does not launch Codex Desktop, expose a debugging port, create an app
profile, or wait for real-time playback. It is faster and less disruptive than
fake-microphone automation.

The endpoint is private, unsupported, and version-sensitive. The bundled helper
reads Codex's existing ChatGPT login inside the Node process. Never print
`auth.json`, expose its token, pass the token through shell arguments or
environment variables, or send it anywhere except the hard-coded
`https://chatgpt.com/backend-api/transcribe` endpoint.

## 1. Fix the contract

Resolve:

- one or more readable local audio or video inputs;
- whether the user wants transcript files, transcript text in chat, or both;
- the requested language hint, if any;
- the requested output location and naming;
- whether cleanup, speaker labels, or timestamps are also wanted;
- whether the user explicitly wants transcript-only output.

Treat an explicit request to transcribe through Codex as authorization to send
only the selected media to ChatGPT. Do not broaden that authorization to other
files.

Preserve the raw transcript before summarizing or editing it. The helper writes
`NAME.transcript.txt` beside each source by default and never modifies the
source. If the user asks for a different filename, rename the completed
artifact only after transcription succeeds.

Unless the user explicitly requests transcript-only output, also create
`NAME.summary.md` and `NAME.action-items.md` beside every completed transcript.
If the user provides existing transcript files without media, skip
transcription and start from the synthesis step.

**Complete when:** the inputs, destination, transcript form, and optional
transformations are explicit.

## 2. Pass local preflight

For every input, run:

```sh
scripts/preflight.sh "$INPUT" "${TMPDIR:-/tmp}"
```

The helper checks:

- a readable, FFmpeg-decodable audio stream and positive duration;
- `ffmpeg`, `ffprobe`, and the `libopus` encoder;
- a Node runtime with `fetch`, `FormData`, `AbortSignal.timeout`, and
  `fs.openAsBlob`;
- a readable Codex authentication file at
  `${CODEX_HOME:-$HOME/.codex}/auth.json`;
- writable source-output and temporary directories.

Preflight does not print or parse credentials and does not contact the endpoint.
The first transcription request is the live compatibility check.

Treat `status=blocked` as final for that attempt. If authentication is absent,
ask the user to run `codex login`; never copy authentication state from another
profile or improvise token refresh.

**Complete when:** every input reports `status=ready`.

## 3. Run the bundled helper

Use the Node executable reported by preflight:

```sh
NODE="/path/reported-after-node="
"$NODE" scripts/codex-transcribe.mjs "$INPUT"
```

Pass multiple inputs in one run when they share the same options:

```sh
"$NODE" scripts/codex-transcribe.mjs \
  --language en \
  "$FIRST_INPUT" \
  "$SECOND_INPUT"
```

Available options:

- `--language CODE`: provide a spoken-language hint;
- `--bitrate RATE`: set the Opus bitrate; default `32k`;
- `--chunk-minutes NUMBER`: reduce the chunk duration; default `20`, maximum
  `23`;
- `--force`: allow replacement of existing `.transcript.txt` or
  `.transcript.partial.txt` artifacts.

Do not use `--force` unless replacement is within the user's request. The
helper processes inputs and chunks sequentially, writes
`NAME.transcript.partial.txt` after every successful chunk, and writes
`NAME.transcript.txt` only after all chunks succeed. It removes only its
run-owned temporary encoded chunks.

The default 20-minute boundary is empirical. On 2026-07-29:

- 23:10 succeeded at 3.26 MB;
- 23:19 and 23:20 failed at about 3.28 MB;
- the same 30-minute audio failed at both 6.35 MB and 4.20 MB;
- 20-minute chunks larger than 5 MB succeeded.

The observed private-backend ceiling was therefore duration-driven and between
1,390 and 1,399 seconds. It may change. Keep the default safety margin; if a
boundary-like failure appears, retain the partial transcript and retry only
after choosing a smaller chunk duration.

**Complete when:** every requested input has a non-empty completed transcript,
or the exact failed input and chunk are known.

## 4. Derive the summary and actionable items

Read the entire completed raw transcript before synthesizing it. Do not treat a
`.transcript.partial.txt` file as complete unless the user explicitly accepts a
partial analysis. Write derived artifacts in the user's language unless they
request another language.

Create `NAME.summary.md` with:

```markdown
# Summary: Human-readable title

## Executive summary

## Content-specific themes

## Decisions and strategic implications

## Open decisions

## Caution
```

Adapt the thematic headings to the recording instead of forcing generic
categories. Use `Main idea` instead of `Executive summary` for short or
single-topic recordings. Include `Caution` only when audio quality,
transcription errors, or unverified legal, financial, funding, medical, or
technical claims materially affect confidence.

Keep the summary focused. It may include a short `Key next steps` section, but
keep the canonical, complete checklist in `NAME.action-items.md`.

Create `NAME.action-items.md` with:

```markdown
# Action items: Human-readable title

## Workstream

- [ ] Concrete next step.

## Decisions still required

## Ownership

## Important verification note
```

Omit empty sections. Keep an `Ownership` section whenever actions exist, even
when it only records that owners were not assigned.

Group actions by the workstreams present in the recording. Apply these grounding
rules:

- separate explicit commitments from sensible follow-ups inferred by Codex,
  using distinct sections or labels when both are present;
- phrase unresolved claims as verification tasks, not conclusions;
- include decisions still required instead of pretending they were settled;
- name an owner or deadline only when the transcript assigns one;
- state that ownership or timing is unassigned when absent;
- do not turn every idea, example, or speculation into an action;
- preserve names and material terminology, while marking uncertain
  transcription-derived names as uncertain;
- never invent quotes, timestamps, speaker identities, decisions, or consensus.

Before writing either artifact, inspect whether it already exists. Do not
replace an existing summary or actionable-items file unless the user explicitly
requested replacement. When only one derived artifact is missing, create only
the missing artifact.

For multiple transcripts, create both derived files per transcript. Then return
a concise cross-recording digest in chat that keeps each recording distinct.
Preserve the raw transcript files unchanged.

**Complete when:** every completed transcript has a non-empty summary and
actionable-items artifact, unless the user requested transcript-only output.

## 5. Verify and deliver

For each input:

1. Confirm `NAME.transcript.txt` exists and is non-empty.
2. Confirm `NAME.transcript.partial.txt` is absent after complete success.
3. Unless transcript-only was requested, confirm `NAME.summary.md` and
   `NAME.action-items.md` exist and are non-empty.
4. Confirm the source media and raw transcript are unchanged by synthesis.
5. Confirm no `codex-transcribe-*` temporary directory from the run remains.

Blank lines separate chunk results; they are not speaker or scene boundaries.
Do not invent timestamps, speaker identities, or missing words. State
uncertainty when the raw transcript is ambiguous.

Return:

- `complete` or `blocked`;
- for transcribed media, each source path, duration, and chunk count;
- for transcript-only synthesis, each source transcript path;
- each transcript artifact path;
- each summary and actionable-items artifact path;
- confirmation that no Codex app instance was launched;
- cleanup evidence;
- a concise summary and the most important actionable items in chat.

## 6. Handle private-endpoint drift

On HTTP 401, report the failure and ask the user to refresh Codex authentication
with `codex login`. On other HTTP or response-shape failures, report the bounded
status and error without credentials.

Do not silently switch to a different transcription engine or launch a visible
Codex instance. Offer these explicit alternatives:

- OpenAI's supported Audio Transcriptions API, with Platform API
  authentication and billing;
- the older Codex Desktop fake-microphone workflow, which requires a visible
  isolated app process and real-time playback;
- a local transcription model such as Whisper.

**Complete when:** failure preserves the source, credentials, partial
transcript, and exact diagnostic needed for the user's next choice.
