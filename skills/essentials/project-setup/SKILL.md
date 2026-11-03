---
name: project-setup
description: "Load this skill before you migrate a project to the user's stack, replace a layer with the stack's choice, or start a new project. Covers what each choice replaces, the migration order, the new-project files, the global package store, the docs layout, and the done checks."
---

# Project setup

The stack table in the global `AGENTS.md` is the target. This skill adds what
each choice replaces and the steps to get there. Run these steps only when the
target is the stack table. A change inside a tool the table already names is
ordinary work. Run only the layers the user asked for.

## What each choice replaces

| Layer | Replaces |
| --- | --- |
| Packages and monorepo | npm, yarn; Turborepo for plain task runs |
| Web app | Next.js |
| Mobile app | NativeWind, `StyleSheet` |
| API | Express, NestJS; Next.js API routes |
| Data and auth | Firebase, Supabase |
| Hosting | Vercel |
| Code checks | ESLint, Prettier, Biome; tsc, tsgo; lefthook, husky; knip |
| Tests | Maestro, Playwright, Detox |
| CI and commits | GitHub-hosted runners |

## Migrate a project

1. Compare the project with the stack table. List what to replace, and what
   the project lacks, such as formal verification or the global package store.
   Give the order, then wait for the user's pick. Skip the wait when the user
   already named the layers.
2. For a move into mise, load `mise-review` and stop at its plan. It is
   read-only. Do the move after the user approves the plan.
3. Move one layer per PR. Use the versions that the global `AGENTS.md` sets.
   Keep the behavior the same, and keep fixes and features out of it.
4. After each layer, run the app and the checks. Then remove the old tool
   completely: its config, scripts, and dependency. Remove the old lockfile
   only when the package manager changes.

## Start a new project

1. Ask which folder: `~/code/personal`, `~/code/work`, `~/code/client`, or
   `~/development`.
   Ask about layers the table doesn't cover. Ask before you create the GitHub
   repo. The first commit on the default branch needs no question.
2. From day one, the project has:
   - `mise.toml` with pinned tools and `setup` and `check` tasks
   - repo config that turns on the global store of the package manager in use,
     so a new worktree or a teammate's clone doesn't download every package
     again
   - hk hooks and CI
   - `t3.json`, whose setup script runs when T3 creates a worktree
   - `.github/pull_request_template.md`, from the `pr` skill's template
   - the docs below
3. Make one real path work end to end. No sample pages, demo data, or
   placeholder code.
4. It's done when `mise run setup` and `mise run check` pass. Check this on a
   fresh clone, and in a new worktree from `delegate_task` with
   `isolation: "worktree"`.

For a project with a runnable app, also add a `dev` task and one E2E check.
It's done only when `mise run dev` serves the app and its ready check passes.
A library, a template, or a skills repo has no `dev` task and no E2E check.

## Docs layout

- `AGENTS.md`: short always-on rules, then pointers such as "Before you do X,
  read `docs/agents/x.md`".
- `GLOSSARY.md` and `docs/adr/`: domain terms and decisions, written with the
  `domain-modeling` skill. Create each one when it gets its first entry. In a
  migration, `GLOSSARY.md` and `docs/adr/` replace `CONTEXT.md`.
- `docs/agents/`: how-tos for agents, such as git workflow, dev runtime, and
  verification.
- `DESIGN.md` for the visual system of a project with UI, and `PRODUCT.md`
  for product intent.
