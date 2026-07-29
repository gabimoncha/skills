---
name: triage-codex-sessions
description: Review this project's Codex sessions, recommend next steps, and archive confirmed completions.
disable-model-invocation: true
---

# Triage Codex Sessions

Reconcile Codex session lifecycle with current project evidence in two phases.

## Scope

Lifecycle and archive state are independent: a completed session can remain unarchived. Match sessions to the current project by working directory.

- By default, review all matching sessions that are not archived, including active, idle, and notLoaded sessions. Include the current triage session when it matches.
- For an explicit active-only request, review only lifecycle-active sessions.
- Explicit unarchived, history, or archive-review requests use the all-matching-unarchived scope.
- A session is an **archive candidate** exactly when it matches the project, is unarchived, has a non-active lifecycle, is classified Complete or Superseded, and is not the current triage session.

## 1. Review

1. Select the requested scope and read every selected session far enough back to recover its objective, delivered outcome, unresolved work, blockers, and latest recommendation.
2. Inspect project evidence relevant to those claims: working-tree status, recent commits, changed files, issue or spec artifacts, and current configuration. Use external-system evidence available through the session or connected tools.
3. Classify every selected session:
   - **Complete** — its stated objective was delivered. An audit, investigation, or setup can be complete while producing separate follow-up work.
   - **Pending** — its stated objective still has actionable work.
   - **Blocked** — progress depends on an unavailable decision, account, credential, service, or prerequisite.
   - **Superseded** — a newer session or verified project change replaced its objective.
   - **Unclear** — the evidence supports no other classification.
4. Reconcile overlaps so each unresolved outcome appears once, then rank remaining work by dependency order and impact.
5. Return:
   - the evidence baseline, including Git revision and working-tree state;
   - every selected session, its classification, and a one-line reason;
   - recommended next steps in order;
   - for an archive review, the exact archive candidate list with each title and thread ID.

Keep the review read-only. For an archive review, ask the user to confirm the exact candidate list. The review is complete when every session in scope is classified and every archive candidate has a title and thread ID.

## 2. Archive after confirmation

Enter this phase only after a later user message confirms all candidates or identifies exact candidates by title or thread ID.

1. Refresh each confirmed session’s lifecycle, latest turn, and supporting evidence. Reapply the archive-candidate rule and explain every candidate removed by the refresh.
2. Archive each remaining confirmed candidate with the Codex thread archive tool.
3. Report each confirmed candidate as archived, removed after refresh with its reason, or failed with its error. Leave every other session open.

This phase is complete when every confirmed candidate has one of those reported dispositions.
