# Tool Patterns

Use these patterns as decision aids, not as a universal configuration template.
Derive exact versions, paths, globs, and command names from the target
repository, then confirm newly introduced syntax against current official
documentation.

## Table of contents

- [Cross-tool reconnaissance](#cross-tool-reconnaissance)
- [mise](#mise)
- [hk and Pkl](#hk-and-pkl)
- [ast-grep](#ast-grep)
- [React Doctor](#react-doctor)
- [Oxlint](#oxlint)
- [Oxfmt](#oxfmt)
- [Composition and evidence](#composition-and-evidence)

## Cross-tool reconnaissance

Before changing configuration, inspect:

- repository and nested guidance;
- package manifests, workspace definitions, runtime files, and lockfiles;
- mise configuration and lock data;
- hk/Pkl configuration plus Git's effective hooks path;
- ast-grep configuration, rule directories, utilities, and rule tests;
- React roots, generated trees, and existing doctor or plugin configuration;
- Oxlint and Oxfmt root and nested configuration;
- package scripts, mise tasks, hook commands, and CI jobs;
- current tool resolution from the repository environment.

A globally available executable proves only that a shim or installation exists.
Repository adoption requires checked-in configuration or a documented,
reproducible command path.

For every tool, identify one version authority. Reconcile intentional coupling
among mise tool declarations or locks, package-manager locks, package
dependencies, Pkl package imports, and CI setup. Avoid adding a second authority
only to make a command locally available.

Treat a command as repository-owned only when its executable or dependency and
configuration are present at the intended ownership boundary. Guidance prose
and familiar ecosystem conventions do not prove that a command exists. When
focused validation reveals a missing dependency or unsupported command, remove
the speculative integration and classify it as blocked instead of leaving an
unexecutable task behind.

## mise

### Detect

Look for `mise.toml`, `.mise.toml`, split mise configuration, `mise.lock`,
legacy runtime files, task includes, environment directives, and CI setup.
Compare declared runtimes with package-manager metadata and workflow versions.

### Applicability

Use mise when the repository benefits from a reproducible developer runtime,
tool resolution, or a common task entry point. Retain a simpler established
runtime manager when introducing mise would only duplicate it.

### Integrate

- Declare only tools the repository actually needs.
- Preserve the package manager selected by manifests and lockfiles.
- Give tasks stable names for setup, read-only checks, and explicit fixes.
- Compose existing scripts rather than copying their internals into TOML.
- Use `mise install` and `mise lock` according to the repository's chosen
  version policy; distinguish intentional floating tools from reproducible pins.
- Keep environment loading and setup side effects explicit.

### Validate

Inspect parsed configuration, resolved tool versions, and task discovery. Run
the narrow tasks first, then the public aggregate. Confirm a fresh setup path
installs declared tools without silently replacing the package manager.

### Cautions

Do not infer a repo's configuration from global shims. Reconcile duplicated
runtime declarations instead of allowing mise, manifests, CI, and lockfiles to
drift. A mise post-install hook is not proof that Git hooks were installed.

## hk and Pkl

### Detect

Look for `hk.pkl`, Pkl package imports, `hk` and `pkl` tool declarations,
`HK_MISE`, mise install hooks, hook profiles, and the effective Git hooks
directory. Read imported hk package versions as part of version reconciliation.

### Applicability

Use hk when the repository needs one staged-file-aware policy surface for Git
hooks and explicit full checks. Use Pkl as hk's configuration language, not as
an unrelated extra layer.

### Integrate

- Declare hk and Pkl in the repository environment.
- Enable mise integration with `HK_MISE=1` when hk commands should resolve
  mise-managed tools.
- Prefer built-ins where their behavior matches the repo; customize commands,
  globs, batching, dependencies, and fix behavior where it does not.
- Keep staged hooks fast and scoped. Put expensive whole-repository checks in a
  full profile, pre-push route, or CI as appropriate.
- Separate read-only checks from fixers even if both are defined in the same
  Pkl file.
- Route hook installation through setup with `hk install --mise` when mise owns
  hk's environment.

### Validate

Evaluate or load the Pkl configuration through hk, list or dry-run the relevant
hooks where supported, and run a narrow hook route. Resolve Git's configured
hooks path and inspect the expected hook entry points after installation.

### Cautions

Keep the hk Pkl import compatible with the installed hk version. Verify
`HK_MISE` behavior from the actual environment. Do not claim hook coverage from
configuration alone: actual hook files and invocation matter.

## ast-grep

When the `$ast-grep` skill is available, use its workflow and rule reference to
author, debug, and test structural searches and rules. This section remains the
authority for whether ast-grep belongs in the repository and how it composes
with mise, hk, Oxlint, Oxfmt, React Doctor, hooks, and CI. When the skill is not
available, use the guidance below and verify novel syntax against current
official documentation.

### Detect

Look for `sgconfig.yml` or equivalent, rule and utility directories, rule test
configuration, package scripts, and CI invocations. Search for structural
queries embedded in scripts before adding a second route.

### Applicability

Adopt ast-grep only when a concrete structural invariant, migration, or
repository-specific anti-pattern cannot be expressed reliably by existing
textual or compiler checks. Otherwise mark it skipped with that reason.

### Integrate

- Keep the project configuration at the ownership root.
- Point `ruleDirs`, `utilDirs`, and `testConfigs` at repository-owned content
  only when those resources exist.
- Give every enforcing rule focused positive and negative tests.
- Separate scans from rewrite rules and make rewrites explicitly invoked.
- Scope languages and paths to the code the rule understands.

### Validate

Run the configured rule tests before scans. Exercise one safe positive fixture
and one negative fixture, then run the narrow scan target. Prove rewrite
idempotence on a controlled fixture before exposing a fix command.

### Cautions

An empty config is not useful adoption. Avoid regex-shaped structural rules,
untested autofixes, and whole-repository scans whose language or generated-file
scope is undefined.

## React Doctor

### Detect

Identify actual React, React DOM, React Native, or Expo roots, their workspace
boundaries, existing `reactDoctor` settings, package scripts, standalone CLI
usage, and any Oxlint React Doctor plugin.

### Applicability

Run React Doctor only in React workspaces. Skip non-React repositories and
non-React packages instead of forcing a root-wide invocation.

### Integrate

- Keep a full `react-doctor` manual or CI diagnostic for broad analysis.
- Use `--scope changed` for a changed-files loop and `--staged` for hooks when
  those modes match the repository's workflow.
- Select a blocking threshold deliberately; record whether warnings are
  advisory or gating before adding `--blocking`.
- Treat the standalone CLI and the Oxlint plugin as complementary surfaces.
  The standalone analysis is broader, so plugin enablement does not replace it.
- Preserve repository-specific ignores and category or rule decisions.

### Validate

Run from each intended React ownership root. Check the full command separately
from changed or staged routing, and verify that the chosen blocking threshold
produces the intended exit status.

### Cautions

Do not run from a monorepo root if that changes discovery or hides workspace
configuration. Avoid converting a noisy baseline into a blocking hook without
an explicit adoption decision.

## Oxlint

### Detect

Inspect root and nested Oxlint configs, package scripts, workspace task routing,
ESLint configs, plugins, generated-file exclusions, type-aware settings, and
CI flags. Determine which ESLint semantics Oxlint does not cover.

### Applicability

Use Oxlint for supported JavaScript and TypeScript linting. Keep complementary
lint tooling for rules, processors, plugins, or file types that cannot be
preserved.

### Integrate

- Use the current official migration facility as an audited starting point, not
  as authority to delete the previous config.
- Review migrated rules, severity, environments, ignores, plugins, and nested
  overrides against the baseline.
- Preserve public lint scripts and workspace routing where callers depend on
  them.
- Expose a read-only `oxlint` command and a separately named command using
  `oxlint --fix`.
- Scope hook invocations to eligible changed files and retain generated-file
  exclusions.

### Validate

Validate each config at its ownership root. Run the read-only command against a
controlled known-clean sample and, where safe, a known violation. Run fixes only
on a disposable or explicitly approved sample, then prove the read-only command
does not change files.

### Cautions

Do not claim full ESLint replacement without an unsupported-semantics inventory.
Nested workspaces may require different plugins, environments, or globals.
Type-aware modes can change cost and prerequisites, so measure them in the
intended hook and CI paths.

## Oxfmt

### Detect

Inspect root and nested Oxfmt or predecessor formatter configuration, existing
ignore files, generated content, embedded-language needs, import ordering, and
format scripts.

### Applicability

Use Oxfmt only for file types and semantics it supports in the target
repository. Preserve complementary formatters where unsupported content or
behavior remains.

### Integrate

- Translate established style intentionally instead of applying defaults
  across the repository.
- Carry forward generated, vendored, build-output, and tool-owned exclusions.
- Expose separate `oxfmt --check` and `oxfmt --write` commands; make hooks pass
  only eligible staged files.
- Coordinate import sorting and other transforms with Oxlint and ast-grep so
  one tool owns each rewrite.

### Validate

Run the check command on a narrow clean sample. Run the write command only on a
controlled sample, inspect the diff, rerun it for idempotence, and then rerun
the check. Expand scope only after configuration behavior is understood.

### Cautions

Never bootstrap by formatting the whole repository. Experimental options and
supported file types can change; verify them in current official documentation.
Keep check and write semantics distinct even if the CLI offers shorthand.

## Composition and evidence

Prefer this fix order when all stages apply:

1. explicit ast-grep structural rewrites;
2. Oxfmt writes;
3. Oxlint fixes;
4. read-only ast-grep, React Doctor, Oxlint, and Oxfmt checks.

Change the order only when repository evidence shows a different stable graph,
then prove the chosen graph is idempotent. hk should orchestrate staged or
changed files; mise should expose reproducible entry points; CI should call the
same read-only graph without hook-only mutation.

Extend CI only through a provider, action-version policy, and validation route
already established by the repository. If the repository has no CI convention,
record the missing seam as blocked; do not create a workflow whose actions and
syntax cannot be verified from current documentation and local checks.

Report exact commands and their mutation behavior. Separate config validation,
focused success, controlled failure, hook installation, hook execution, and CI
wiring evidence. Remove tool dependencies and configurations that no exercised
command owns, unless they retain a named complementary responsibility. Record
skipped tools as decisions, not omissions.
