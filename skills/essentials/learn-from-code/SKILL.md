---
name: learn-from-code
description: Review code changes to teach the principles behind them. Invoke on its own after coding or in a PR task; optional text can name learning goals or a review target. Also supports practicing concepts saved in LEARN.md.
---

# Learn From Code

Help the user explain and apply the principles behind their code. Adapt depth
to their stated background and answers; correct code alone does not demonstrate
understanding.

## Invocation

`$learn-from-code` starts an educational review. The user does not need to name
files, concepts, experience level, or output instructions. Discover the changes,
choose useful lessons, and maintain the notebook as part of the review.

Treat additional text as optional guidance, not a required argument format:
`$learn-from-code I've just started learning Python and async programming`.
Use named topics to focus the explanation while still reporting consequential
issues in scope. With no learning goals, infer teachable concepts from the code;
start with plain language and explain prerequisites as they arise. Reserve the
practice-only workflow for an explicit request to practice or be quizzed.

## Review

1. Choose scope from available context, in this order:
   - An explicit target, or the PR identified by the current task. For a PR,
     review its head against its base; keep unrelated local edits out of scope.
   - Local changes: inspect staged and unstaged diffs and untracked source files.
     Untracked files are not included in ordinary Git diffs.
   - With a clean working tree, the current task's changes or the branch diff
     against an identifiable base.
   State the chosen scope and read surrounding code as needed. Ask a short
   question only if no reviewable target can be identified; missing learning
   goals or experience information should not block the review. Resolve the
   notebook as described below and read relevant prior learning.
2. Select a few consequential lessons, usually 3–5, respecting the user's stated
   familiar topics. Cover relevant language
   semantics, runtime or browser behavior, design principles, and framework
   contracts. Explain syntax when it affects meaning. Include sound decisions
   worth repeating; surface serious bugs even beyond the lesson budget.
   For demonstrated concepts, focus on new conditions, regressions, or a brief
   transfer check instead of repeating the full lesson. Always report a current
   bug, regardless of the learner's prior understanding.
3. Verify third-party API usage with `$find-docs` when available, otherwise
   official documentation. Match the installed version, using lockfiles or
   runtime configuration. Verify uncertain language and browser claims against
   authoritative sources. Cite supporting pages; label unavailable verification
   as unresolved rather than teaching it as fact.
4. For each lesson, show:
   - **Evidence:** file and symbol or a small code excerpt.
   - **Assessment:** sound choice, required correction, or contextual tradeoff.
   - **Why:** the mechanism, consequence, and limits of the principle.
   - **Application:** a minimal improvement and why it helps, or why to retain
     the current approach. Distinguish observed behavior from inference.
   Verify self-contained examples, practice prompts, answer keys, and fixes against
   the actual code using a small trace or safe isolated execution. Include any
   required setup or guards. For mutable results, distinguish observations made
   immediately after each call from saved references inspected after all calls.
   Check fixes against the stated contract during the call and later use; for
   snapshots, explain what remains shared, including nested objects.
5. Save the lessons, summarize the most useful findings, and link `LEARN.md`.
   Offer one practice question as a next step. Completing the review does not
   require the user to take a quiz. Apply code changes only when requested.

## Learning record

Use project-root `LEARN.md` by default. When the user requests cross-project
learning, supplies a shared path, or an existing `LEARN.md` points to one, read
[shared notebook guidance](references/shared-notebook.md). Reuse a previously
chosen destination; ask for a path only when shared storage is wanted but its
location is unknown. Continue reviewing while that question is pending.

Before writing the notebook, read
[learning-record guidance](references/learning-record.md). For a new notebook,
copy [LEARN_TEMPLATE.md](references/LEARN_TEMPLATE.md), fill its placeholders,
and remove unused sections. Existing notebooks keep their useful structure and
user notes. If saving is unavailable, return proposed content and say so.

For a new or untracked project-local notebook, ensure `/LEARN.md` is ignored in
the root `.gitignore` without duplicating rules. If already tracked, preserve that
convention and explain that edits remain tracked. Shared notebooks follow their
chosen repository's tracking conventions.

## Practice

When asked to practice, resolve the notebook first, then use requested concepts
or due entries; skip a fresh code review. Ask one question at a time and wait
before revealing the answer. Favor
predictions, explanations, and changed examples over terminology recall. For
example, ask what breaks if two operations finish in reverse order, and why.
Give specific feedback, add scaffolding when needed, and record the outcome.
Exclude unresolved technical claims from answer keys and recall practice.
