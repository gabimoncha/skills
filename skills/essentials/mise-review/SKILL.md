---
name: mise-review
description: Load this skill before you plan how a repository can use mise more, for example when the user asks to update this project using mise, asks what mise can replace, wants to move their setup to mise, or asks you to review a mise update. Covers installed, pinned, and latest mise versions, blockers in the pinned release, a component inventory with its guarantees, mise bootstrap, dotfiles, tasks, hooks, lockfiles, settings, self-update, per-component verdicts with read-only checks, a refutation review, and an ordered migration plan.
metadata:
  internal: true
---

# Mise review

Answer one question: how can this repository use mise more, and what exactly
should change? Deliver a migration plan for the repository. Cite a changelog
entry only when it blocks or enables a recommendation.

When subagents are available, split steps 2 to 5 by area, such as packages,
files, macOS settings, and tasks. Run the areas in parallel. Otherwise, do the
steps in sequence.

## Guardrails

- Run only read-only commands against the real machine. Each generated page
  under `docs/cli/` has an `Effect` line. Run a command marked
  `modifies state` only with `--dry-run` and isolated state.
- Never run `mise install`, `mise self-update`, `mise dotfiles apply`,
  `mise dotfiles sync`, `defaults write`, or `launchctl`. Never run
  `mise bootstrap` or a bootstrap `apply` without `--dry-run`.
- Search the config for `exec(` before you run `--dry-run`, `plan`, or
  `status`. These commands render `[bootstrap.files]` templates, so an `exec()`
  call in a template runs.
- Run every mise check from `/` with isolated state:

  ```sh
  iso=$(mktemp -d /tmp/mise-review.XXXXXX)
  cd / && MISE_STATE_DIR="$iso/state" MISE_CACHE_DIR="$iso/cache" \
    MISE_DATA_DIR="$iso/data" MISE_SELF_UPDATE_AUTO=0 MISE_AUTO_INSTALL=0 \
    MISE_GLOBAL_CONFIG_FILE="$repo/<config>.toml" "$mise_bin" settings ls
  ```

  From a directory inside HOME, `MISE_GLOBAL_CONFIG_FILE` makes mise load
  `~/.config/mise/config.toml` as an untrusted project config. `cd /` prevents
  that.
- Treat a linked config as live. If `~/.config/mise/config.toml` is a symlink
  into the repository, each edit to that file changes the machine at once.
  Keep that file loadable by the installed mise. Put settings that need a
  newer mise in a separate repository file, set its `min_version`, and test it
  through `MISE_GLOBAL_CONFIG_FILE`.
- Treat a documentation match as a claim, not proof. Reproduce each critical
  claim with the real binary under isolated state.
- Present findings in the conversation. Write a report file only when the user
  asks. Edit repository files only when the user asks for implementation.

## 1. Establish versions and blockers

1. Record the installed mise executable and its `--version`. Get the path with
   `type -P mise` in bash or `whence -p mise` in zsh, then resolve symlinks.
   Shell activation defines a `mise` function, so `command -v mise` can print
   only `mise`.
2. Record the version that the repository installs on a new machine. Look in
   its installer script, package manifest, and CI. If nothing pins it, record
   that.
3. Record the latest stable release with `gh release view --repo jdx/mise`.
   Record its commit with `gh api repos/jdx/mise/commits/<tag> -q .sha`.
4. Download the pinned release asset for this platform into a new folder under
   `/tmp`. Compare its SHA-256 with the asset `digest` from
   `gh release view <tag> --repo jdx/mise --json assets`. Stop if they differ.
5. Load the repository's mise config with the pinned binary, then with the
   installed binary. Use the isolated command above. Record each parse error
   and warning.
6. Report each parse error as a blocker. Example: the pinned 2026.9.6 could not
   parse a setting in a dotfiles config, so setup failed on every new machine.

Done when you have three versions with their sources, the tag commit, and a
parse result for each binary.

## 2. Inventory the repository

1. Read the repository rule files, such as `AGENTS.md` and `DECISIONS.md`.
   Record each constraint that limits a migration.
2. List each script, function, and data file that installs, links, configures,
   or schedules something. Record its consumer and its line count.
3. Record what each component does and its guarantees: backups, merges,
   ordering and prerequisites, failure isolation, dry-run, reruns, and sudo or
   interactive steps.
4. Record the current mise use: config files, which of them HOME links to,
   settings, tasks, hooks, and lockfiles.

Done when each setup script and each data file that it reads has a row with
its guarantees and line count.

## 3. Read the mise docs at the latest tag

Read the docs at the tag commit. The website and `main` can describe newer
behavior.

1. Read <https://mise.jdx.dev/llms.txt> to find pages. Read
   `docs/glossary.md` to resolve terms.
2. List the paths with `gh api "repos/jdx/mise/git/trees/<sha>?recursive=1"`.
   Fetch each page with
   `gh api -H 'Accept: application/vnd.github.raw' "repos/jdx/mise/contents/<path>?ref=<sha>"`.
   If the API times out, use `raw.githubusercontent.com/jdx/mise/<sha>/<path>`.
3. Cover each area that a component in the inventory could use:
   - `docs/bootstrap.md` and `docs/bootstrap/`: packages (`brew`,
     `brew-cask`, `mas`, `macos-app`), repos, macOS defaults and login items,
     launchd, services, files, secrets, and modules.
   - `docs/dotfiles.md` and `docs/dotfiles/`: symlink, copy, merge edits,
     groups, history, and sync.
   - `docs/tasks/`, `docs/hooks.md`, `docs/dev-tools/mise-lock.md`, and
     `docs/cli/self-update.md`.
   - Settings in the root `settings.toml`, which `docs/settings.toml` links
     to, and `min_version` in `docs/configuration.md`.
4. Verify each option name and value format in the docs or in `src/` at the
   tag. Example: `minimum_release_age_excludes` matches an npm tool only by its
   full backend ID, `npm:@scope/pkg`. The bare `@scope/pkg` matches nothing.
5. Find the first release of each feature that you plan to use. Search
   `CHANGELOG.md` at the tag.

Done when each inventory row has a docs path at the tag, or a note that mise
has no equivalent.

## 4. Assign verdicts

Give each component one verdict: replace, partial, or keep. For replace and
partial, record:

- The mise config, as short TOML.
- What the repository loses and what it gains.
- The minimum mise version.
- The effort and the risk.
- A check that uses only status, plan, dry-run, or other read-only commands.

Mark keep when mise has no equivalent. Also mark keep when the replacement
drops a guarantee from step 2 that the repository rules or the user need. Name
that guarantee. Run each check with the real binary under isolated state.

## 5. Try to refute each verdict

1. Give each replace and partial verdict to a separate reviewer, with the
   verdict, the tag commit, the docs paths, and the repository paths. Without
   subagents, review each verdict yourself in a separate pass.
2. Instruct the reviewer to refute the verdict against the docs or source at
   the tag and the repository code.
3. Mark the verdict "does not hold" when evidence for it is missing.
4. Change each verdict that does not hold to partial or keep, with the reason.

Done when each replace and partial verdict has a reviewer result.

## 6. Present the plan

Present these parts in this order:

1. One paragraph that gives the share of the repository that mise can take
   over, in the form "mise can replace about N of M setup lines in K files".
2. Ordered migration steps. Put prerequisites first, such as a pin bump that
   removes a blocker. Then put low-risk, high-value steps. Put larger steps
   last. Give each step its config, minimum version, and check.
3. The components that stay scripts, one line each with the reason.
4. The decisions that only the user can make.
5. What remains unverified, including checks that need a real machine.
