---
name: diagnose
description: Evidence-first diagnosis and optional fix loop for bugs, regressions, crashes, flaky tests, and performance problems. Use when the user asks to debug, diagnose, find the root cause, explain why something is broken, trace a failure across system boundaries, investigate intermittent behavior, fix a bug, resolve an issue, or iterate until it is verified fixed. Reproduce the exact symptom, build a tight red-capable signal, test falsifiable causes with targeted evidence, and make the smallest authorized fix. Do not use for straightforward feature implementation or an already-proven mechanical change.
---

# Diagnose

Prove causes with a tight, red-capable feedback loop. Choose one branch from the user's request:

- **Diagnosis only:** locate and prove the cause; preserve product behavior.
- **Diagnose and fix:** after proof, make the smallest authorized change, verify it, and re-diagnose the new state.

Invocation never expands the user's authority. Add behavior-neutral temporary probes only when the requested debugging work authorizes edits or the user separately approves them. Product edits, external mutations, destructive actions, production access, and inaccessible-state reproduction need separate authorization. Read-only scope always wins.

## Workflow

### 1. Anchor the symptom and scope

Start from the user's concrete anchor: file, route, error, log, screen, branch, artifact, or reproduction step. Record the exact trigger, expected result, visible symptom, relevant runtime identity, and whether product edits are authorized. Consult applicable `CONTEXT.md`, ADRs, architecture notes, glossaries, test guidance, existing artifacts, and the current worktree.

Preserve unrelated dirty changes and processes. If the user corrects the trigger, lifecycle, affected component, or symptom, invalidate evidence aimed at the old interpretation and restart from the new anchor.

**Complete when:** the symptom and validation target can be stated precisely, and pre-existing changes are distinguished from work introduced by this run.

### 2. Build and run a tight red-capable signal

Choose the fastest practical, agent-runnable signal that exercises the real bug path and asserts the user's exact symptom: a focused test, script, browser/device flow, trace replay, harness, repeat loop, profiler, or structured human reproduction. Load [feedback-loops.md](references/feedback-loops.md) when no suitable signal exists, the issue is intermittent or performance-related, or a human must drive the flow.

The signal must be:

- **Red-capable:** it goes red on this symptom and can go green when the symptom is absent; “did not crash” is insufficient.
- **Deterministic enough:** pin inputs, time, seed, environment, and network where practical; for flaky behavior, declare the repetition count and acceptance threshold.
- **Tight enough:** use the narrowest practical scope, even when complete evidence collection takes longer.

Run it once before forming causal theories and preserve the command, output, artifact path, and runtime identity. If the symptom needs minimal behavior-neutral capture to become observable, add only that capture first. For inaccessible state, prepare exact steps, expected observation, capture format, and artifact location; then ask the user to reproduce and reply `done`.

**Complete when:** one recorded signal has gone red on the reported symptom, or the diagnosis is explicitly incomplete with the missing access or artifact named.

### 3. Reproduce and minimize

Repeat the baseline enough to distinguish the reported failure from a nearby or intermittent one. Keep the original full scenario for final verification. When minimization will narrow the search, remove one input, caller, configuration value, dependency, or interaction at a time and rerun the red signal. Keep every remaining load-bearing element and the boundary that carries the real failure.

**Complete when:** the exact symptom is captured under the baseline signal, and either a minimized red case exists with every remaining element load-bearing or minimization is documented as non-beneficial or inaccessible.

### 4. Rank causes and define the probe contract

Inspect the path now that the symptom is anchored. Form the smallest useful ranked set of plausible root, contributing, and alternative causes. Give each cause a falsifiable prediction and name the boundary where competing predictions diverge.

Before the next evidence run, define the probe contract:

- the questions this pass must answer
- each candidate's distinguishing prediction
- the events, fields, timestamps, sequence numbers, and correlation IDs that test those predictions
- how the evidence will be tied to the exact visible failure
- the intended process, build, window, document, and runtime identity

Load [instrumentation.md](references/instrumentation.md) when causal probes, runtime logs, metrics, or debug hooks are needed. Prefer a debugger, assertion, metric, profiler, or trace before logs; use targeted structured probes at causal boundaries, complete enough to reconstruct the sequence but narrow enough to avoid perturbing it. Change one causal variable at a time. For browser or app/device work, load the applicable [browser-react.md](references/browser-react.md) or [app-device.md](references/app-device.md).

**Complete when:** every plausible candidate has a prediction, and the planned probe can distinguish the leading candidates and tie its evidence to the exact symptom.

### 5. Run the evidence loop and determine confidence

Run the discriminating probe, collect complete output, correlate events across boundaries, and record evidence for and against every candidate. After each pass, re-rank the candidates and record what observation changed each score. Use controlling interventions when safe: the suspected boundary must control the red signal, not merely appear near it.

Repeat only when a changed input, boundary, or probe can add discriminating evidence. Stop as incomplete when no available probe should increase confidence, a pass adds no evidence and no distinct boundary remains, or the needed evidence requires unavailable access, user action, unacceptable risk, or disproportionate effort.

Report causes with role, a calibrated `0–100%` confidence score, supporting and conflicting evidence, and the next evidence that could change the rank. Treat scores as judgments, not statistical probabilities. Use **Proven — 100%** only when the exact symptom was reproduced, the causal chain was observed, controlling the suspected boundary controls the symptom, every relevant observation is explained, plausible alternatives were falsified or included as contributors, and intermittent behavior was repeated enough to distinguish causality from coincidence.

**Complete when:** the result is honestly classified as **Proven — 100%** or **Incomplete**, with evidence, uncertainty, and the next discriminating action recorded.

### 6. Take the authorized branch

For **diagnosis only**, stop after the confidence report. Keep active diagnostic probes in place and report them as intentional unstaged changes so the user can request cleanup or continuation.

For **diagnose and fix**, load [fix-and-verify.md](references/fix-and-verify.md) only after a **Proven — 100%** result and explicit authorization to edit product behavior. That reference owns the fix plan, regression seam, one-change iteration, original-signal verification, and fresh diagnosis.

### 7. Hand off with evidence accounting

Lead with one status: **Proven — 100%**, **Verified fixed**, or **Incomplete**. Name the validation signal that preserves the evidence. Include the exact boundary and causal chain, changed files, retained artifacts, runtime/process state, remaining risk, and the smallest next action if incomplete.

For a completed fix, remove temporary probes and throwaway harnesses created by this run unless the user asks to retain them or they have become durable diagnostics. Remove only this run's instrumentation; preserve unrelated dirty files. If committing during active diagnosis, stage only intended durable files and report diagnostics that remain unstaged.

## Delegation

Use subagents only when the user explicitly requests delegation, parallel work, subagents, or token optimization. Delegate bounded mechanical collection—known commands, repro loops, logs, screenshots, traces, profiles, extraction, or artifact comparison—with a success condition, output format, runtime boundary, and no-edit instruction unless mutation is explicit. Keep feedback-loop design, cause ranking, confidence scoring, ambiguous interpretation, edits, and the final diagnosis in the main thread. Verify delegated evidence and inspect the worktree and background processes before continuing.
