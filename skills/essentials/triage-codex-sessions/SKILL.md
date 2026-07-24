---
name: triage-codex-sessions
description: Review this project's Codex sessions, recommend next steps, and archive confirmed completions.
disable-model-invocation: true
---

# Triage Codex Sessions

Run a two-phase **reconciliation** between open Codex sessions and the project's current state.

## 1. Review

1. List the unarchived Codex sessions and keep those whose working directory matches the current project. Exclude this triage session from archive candidates.
2. Read each candidate far enough back to recover its stated objective, delivered outcome, unresolved work, blockers, and latest recommendation.
3. Inspect the repository evidence relevant to those claims: working-tree status, recent commits, changed files, issue/spec artifacts, and current configuration. Use external-system evidence only when it is available through the session or connected tools.
4. Classify every session:
   - **Complete** — its stated objective was delivered. An audit, investigation, or setup session can be complete even when it discovered separate follow-up work.
   - **Pending** — its stated objective still has actionable work.
   - **Blocked** — progress depends on an external decision, account, credential, service, or other unavailable prerequisite.
   - **Superseded** — a newer session or verified project change replaced its objective.
   - **Unclear** — the available evidence cannot support another classification.
5. Reconcile overlaps so one unresolved outcome is represented once. Rank the remaining work by dependency order and impact.
6. Return a concise report containing:
   - the evidence baseline, including Git revision and working-tree state;
   - every reviewed session, its classification, and a one-line reason;
   - the recommended next steps in order;
   - an exact **archive candidate** list containing only Complete and Superseded sessions, with each title and thread ID.

The review turn is read-only. Finish it by asking the user to confirm the exact archive candidate list. This phase is complete only when every matching unarchived session is classified and every archive candidate has a thread ID.

## 2. Archive after confirmation

Continue from the reviewed candidate list when a later user message explicitly confirms all or named candidates.

1. Refresh the confirmed sessions' status and latest turn. Remove any session with new activity or evidence that no longer supports completion, and explain the change.
2. Archive each remaining confirmed session with the Codex thread archive tool.
3. Report the archived session titles and any failures. Keep Pending, Blocked, and Unclear sessions open.

This phase is complete only when every confirmed candidate has either been archived successfully or reported with its failure.
