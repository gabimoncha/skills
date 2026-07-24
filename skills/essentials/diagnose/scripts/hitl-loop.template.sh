#!/usr/bin/env bash
# Human-in-the-loop reproduction loop.
# Copy this file, edit the steps below, and run it.
# The agent runs the script; the user follows prompts in their terminal.
#
# Usage:
#   bash hitl-loop.template.sh

set -euo pipefail

step() {
	printf '\n>>> %s\n' "$1"
	read -r -p "    [Enter when done] " _
}

capture() {
	local var="$1" question="$2" answer
	printf '\n>>> %s\n' "$question"
	read -r -p "    > " answer
	printf -v "$var" '%s' "$answer"
}

RUN_ID="diagnose-$(date -u +%Y%m%dT%H%M%SZ)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# --- edit below ---------------------------------------------------------

step "Prepare the target app, page, command, or device state described in the repro."

capture BUILD_ID "Identify the build, version, commit, or artifact under test:"
capture RUNTIME_ID "Identify the runtime, device, account, document, or window:"
capture EXPECTED "Describe the exact symptom expected from this run:"

step "Perform the exact user action or command that is expected to reproduce the symptom."

capture REPRODUCED "Did the reported symptom reproduce? (y/n)"
capture OBSERVED "Describe the observed result, error, or visible state:"
capture REPETITIONS "How many attempts did this observation cover?"
capture CORRELATION_ID "Enter the correlation/debug ID, or 'none':"
capture ARTIFACT_PATH "Enter the captured artifact path, or 'none':"

# --- edit above ---------------------------------------------------------

printf '\n--- Captured ---\n'
printf 'RUN_ID=%s\n' "$RUN_ID"
printf 'STARTED_AT=%s\n' "$STARTED_AT"
printf 'BUILD_ID=%s\n' "$BUILD_ID"
printf 'RUNTIME_ID=%s\n' "$RUNTIME_ID"
printf 'EXPECTED=%s\n' "$EXPECTED"
printf 'REPRODUCED=%s\n' "$REPRODUCED"
printf 'OBSERVED=%s\n' "$OBSERVED"
printf 'REPETITIONS=%s\n' "$REPETITIONS"
printf 'CORRELATION_ID=%s\n' "$CORRELATION_ID"
printf 'ARTIFACT_PATH=%s\n' "$ARTIFACT_PATH"
