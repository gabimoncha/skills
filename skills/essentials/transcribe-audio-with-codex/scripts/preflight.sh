#!/bin/sh

set -u

usage() {
  printf '%s\n' \
    "Usage: preflight.sh INPUT [WORK_PARENT] [NODE_EXECUTABLE]" \
    "NODE_EXECUTABLE may also be supplied through CODEX_TRANSCRIBE_NODE."
}

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
  usage >&2
  exit 2
fi

input_path=$1
work_parent=${2:-${TMPDIR:-/tmp}}
node_override=${3:-${CODEX_TRANSCRIBE_NODE:-}}
failures=

add_failure() {
  if [ -n "$failures" ]; then
    failures="${failures}
- $1"
  else
    failures="- $1"
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    add_failure "Missing command: $1"
  fi
}

for required_command in ffmpeg ffprobe grep tr dirname basename uname; do
  require_command "$required_command"
done

if [ ! -f "$input_path" ]; then
  add_failure "Input is not a regular file: $input_path"
elif [ ! -r "$input_path" ]; then
  add_failure "Input is not readable: $input_path"
fi

if [ ! -d "$work_parent" ]; then
  add_failure "Temporary parent does not exist: $work_parent"
elif [ ! -w "$work_parent" ]; then
  add_failure "Temporary parent is not writable: $work_parent"
fi

output_parent=$(dirname "$input_path")
if [ ! -d "$output_parent" ]; then
  add_failure "Output directory does not exist: $output_parent"
elif [ ! -w "$output_parent" ]; then
  add_failure "Output directory is not writable: $output_parent"
fi

node_executable=$node_override
if [ -z "$node_executable" ]; then
  node_executable=$(command -v node 2>/dev/null || true)
fi

if [ -z "$node_executable" ]; then
  add_failure "Missing Node.js. Supply NODE_EXECUTABLE or CODEX_TRANSCRIBE_NODE."
elif [ ! -x "$node_executable" ]; then
  add_failure "Node executable is not executable: $node_executable"
elif ! "$node_executable" -e '
  const { openAsBlob } = require("node:fs");
  if (
    typeof openAsBlob !== "function" ||
    typeof fetch !== "function" ||
    typeof FormData !== "function" ||
    typeof AbortSignal?.timeout !== "function"
  ) {
    process.exit(1);
  }
' >/dev/null 2>&1; then
  add_failure "Node lacks fetch, FormData, AbortSignal.timeout, or fs.openAsBlob. Use Node.js 24 or newer."
fi

if command -v ffmpeg >/dev/null 2>&1; then
  if ! ffmpeg -hide_banner -encoders 2>/dev/null |
    grep -q '[[:space:]]libopus[[:space:]]'; then
    add_failure "Installed ffmpeg cannot encode libopus."
  fi
fi

audio_probe=
duration_seconds=
if [ -f "$input_path" ] &&
  [ -r "$input_path" ] &&
  command -v ffprobe >/dev/null 2>&1; then
  audio_probe=$(ffprobe -v error \
    -select_streams a:0 \
    -show_entries stream=codec_name,sample_rate,channels \
    -of default=noprint_wrappers=1 \
    "$input_path" 2>&1)
  probe_status=$?

  if [ "$probe_status" -ne 0 ] || [ -z "$audio_probe" ]; then
    add_failure "ffprobe could not decode an audio stream from: $input_path"
  else
    duration_seconds=$(ffprobe -v error \
      -show_entries format=duration \
      -of default=noprint_wrappers=1:nokey=1 \
      "$input_path" 2>/dev/null || true)
    if [ -n "$node_executable" ] &&
      [ -x "$node_executable" ] &&
      ! "$node_executable" -e '
        const duration = Number(process.argv[1]);
        if (!Number.isFinite(duration) || duration <= 0) process.exit(1);
      ' "$duration_seconds" >/dev/null 2>&1; then
      add_failure "ffprobe did not report a positive duration for: $input_path"
    fi
  fi
fi

codex_home=${CODEX_HOME:-}
if [ -z "$codex_home" ] && [ -n "${HOME:-}" ]; then
  codex_home=$HOME/.codex
fi

auth_path=
if [ -z "$codex_home" ]; then
  add_failure "Could not resolve CODEX_HOME or HOME for Codex authentication."
else
  auth_path=$codex_home/auth.json
  if [ ! -f "$auth_path" ]; then
    add_failure "Codex authentication file is missing: $auth_path. Run codex login."
  elif [ ! -r "$auth_path" ]; then
    add_failure "Codex authentication file is not readable: $auth_path"
  fi
fi

if [ -n "$failures" ]; then
  printf '%s\n' "status=blocked" >&2
  printf '%s\n' "$failures" >&2
  exit 1
fi

absolute_input=$(
  cd "$(dirname "$input_path")" &&
    printf '%s/%s\n' "$(pwd -P)" "$(basename "$input_path")"
)
absolute_parent=$(cd "$work_parent" && pwd -P)
absolute_output_parent=$(cd "$output_parent" && pwd -P)
node_version=$("$node_executable" --version)

printf '%s\n' \
  "status=ready" \
  "input=$absolute_input" \
  "audio_stream=$(printf '%s' "$audio_probe" | tr '\n' ' ')" \
  "duration_seconds=${duration_seconds:-unknown}" \
  "ffmpeg=$(command -v ffmpeg)" \
  "ffprobe=$(command -v ffprobe)" \
  "node=$node_executable" \
  "node_version=$node_version" \
  "auth_path=$auth_path" \
  "output_parent=$absolute_output_parent" \
  "work_parent=$absolute_parent" \
  "endpoint=private-unsupported"
