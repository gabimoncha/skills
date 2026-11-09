---
name: project-setup
description: "Load this skill before you add a layer that a project lacks, such as auth or hosting, migrate a project to the user's stack, replace a layer with the stack's choice, or start a new project. Covers the stack table, what each choice replaces, the migration order, the new-project files, .worktreeinclude, the global package store, the docs layout, and the done checks."
---

# Project setup

The stack table is the target for the user's own projects. Use it for a layer
that a project lacks, for a migration, and for a new project. A change inside
a tool the table already names is ordinary work. Run only the layers the user
asked for.

## The stack

| Layer | Choice | Replaces |
| --- | --- | --- |
| Packages and monorepo | Bun, `bun.lock`, workspace catalogs, mise tasks. Turborepo only for its cache or for runs in the changed packages | npm, yarn; Turborepo for plain task runs |
| Web app | TanStack Start, Vite, React, Tailwind 4, shadcn/ui | Next.js |
| Mobile app | Expo, Expo Router, dev client, EAS; Uniwind with `DESIGN.md` tokens | NativeWind, `StyleSheet` |
| API | Bun and Elysia for a long-running server; TanStack Start server routes for web app endpoints | Express, NestJS; Next.js API routes |
| Data and auth | Convex with Clerk; for SQL, Drizzle with Neon and Better Auth | Firebase, Supabase |
| Hosting | Cloudflare (Workers, Pages, R2) through Alchemy; Coolify for Docker | Vercel |
| Code checks | oxlint, oxfmt, tsrs (TypeScript 7), hk hooks, fallow, `react-doctor` | ESLint, Prettier, Biome; tsc, tsgo; lefthook, husky; knip |
| Formal verification | tla-ts, for TLA+ models of state machines and async flows | |
| Tests | `bun test` in Bun projects; otherwise Vitest. Vitest where convex-test needs it. `e2e` with agent-device (iOS) and agent-browser (web) | Maestro, Playwright, Detox |
| CI and commits | GitHub Actions on Blacksmith runners, with `mise-action`; Conventional Commits; Renovate for dependency updates | GitHub-hosted runners |
| Env and secrets | Infisical for environment variables; Varlock for agent access | |
| Agent workspace | T3 Code, T3 worktrees, a `t3.json` per repo, and a `.worktreeinclude` | |

## Add a missing layer

When a task needs a layer, or a part of one such as auth, that the project
lacks, use the table's choice. Add only that layer, in the task's own PR.

## Migrate a project

1. Compare the project with the stack table. List what to replace, and what
   the project lacks, such as formal verification, the global package store,
   or `.worktreeinclude`. Give the order, then wait for the user's pick. Skip
   the wait when the user already named the layers.
2. For a move into mise, load `mise-review` and stop at its plan. It is
   read-only. Do the move after the user approves the plan.
3. Move one layer per PR. Use the versions that the global `AGENTS.md` sets.
   Keep the behavior the same, and keep fixes and features out of it.
4. After each layer, run the app and the checks. Then remove the old tool
   completely: its config, scripts, and dependency. Remove the old lockfile
   only when the package manager changes.

## Start a new project

1. Ask which folder: `~/code/personal`, `~/code/work`, or `~/code/client`.
   Ask about layers the table doesn't cover. Ask before you create the GitHub
   repo. The first commit on the default branch needs no question.
2. From day one, the project has:
   - `mise.toml` with pinned tools and `setup` and `check` tasks
   - repo config that turns on the global store of the package manager in use,
     so a new worktree or a teammate's clone doesn't download every package
     again
   - hk hooks and CI
   - `.worktreeinclude`: the gitignored files and folders that a new worktree
     copies from the main checkout. List the `.env` files,
     `.claude/settings.local.json`, `mise.local.toml`, `plans/`, `.scratch/`,
     and any other local file the work needs. Leave out a file that must
     differ per worktree, such as an env file that points at one backend
     deployment. Write a folder as `plans/`, never `plans/*`: Worktrunk
     copies whole ignored folders, so `plans/*` copies nothing, and a `!`
     line inside a listed folder has no effect.
   - `t3.json`, with a setup script that runs when T3 creates a worktree
     (`"runOnWorktreeCreate": true`). T3 doesn't read `.worktreeinclude`, so
     the script's first step is `wt step copy-ignored --require-include`. It
     copies the listed files from the main checkout and never overwrites a
     file. Claude Code and the Codex app read `.worktreeinclude` themselves.
   - `.github/pull_request_template.md`, from the `pr` skill's template
   - the docs below
3. Make one real path work end to end. No sample pages, demo data, or
   placeholder code.
4. It's done when `mise run setup` and `mise run check` pass. Check this on a
   fresh clone, and in a new worktree from `delegate_task` with
   `isolation: "worktree"`. That worktree holds the `.worktreeinclude` files.

For a project with a runnable app, also add a `dev` task and one E2E check.
It's done only when `mise run dev` serves the app and its ready check passes.
A library, a template, or a skills repo has no `dev` task and no E2E check.

## Docs layout

- `AGENTS.md`: short always-on rules, then pointers such as "Before you do X,
  read `docs/agents/x.md`". `CLAUDE.md` holds only `@AGENTS.md`.
- `GLOSSARY.md` and `docs/adr/`: domain terms and decisions, written with the
  `domain-modeling` skill. Create each one when it gets its first entry. In a
  migration, `GLOSSARY.md` and `docs/adr/` replace `CONTEXT.md`.
- `docs/agents/`: how-tos for agents, such as git workflow, dev runtime, and
  verification.
- `DESIGN.md` for the visual system of a project with UI, and `PRODUCT.md`
  for product intent.
