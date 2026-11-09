# <Project> agent rules

<Two or three sentences: what the repo is, its apps and packages, what owns
auth and hosting, and the stage of the product.>

## Rules

- <A rule that only this repo needs. Leave out what the global rules, a hook,
  or a linter already enforce.>
- In a new worktree, run `mise run setup` before you run tests.
- Write every PR body from `.github/pull_request_template.md`.
  `gh pr create --body` skips the template.

## Commands

| Command | Use |
| --- | --- |
| `mise run setup` | Install the tools and dependencies. |
| `mise run check` | Lint, type-check, and run the tests. Run it before you report done. |
| `mise run dev` | Start the app. <Delete this row in a repo with no app.> |

## Read before you work

Match the task to a line below, and read that file first.

- Branches, commits, pull requests, or releases: `docs/agents/git-workflow.md`.
- Running the app, logs, sign-in, or devices: `docs/agents/dev-runtime.md`.
- Adding, changing, or removing tests: `docs/agents/verification.md`.
- Naming things, describing behavior, or a design decision: `GLOSSARY.md` and
  `docs/adr/`.
- UI work: `DESIGN.md`. Product behavior: `PRODUCT.md`.

## Project map

- `apps/<app>/`: <what it is and where it deploys>
- `packages/<package>/`: <what it owns>

## Environment and secrets

- <Where the env variables come from, such as Infisical, and which file each
  app reads.>
- <Which backend or database local work uses, and which one is production.>
