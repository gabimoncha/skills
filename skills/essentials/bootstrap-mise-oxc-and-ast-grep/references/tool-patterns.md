# Tool Patterns

Use these patterns as decision aids, not as a universal configuration template.
Derive exact versions, paths, globs, and command names from the target
repository, then confirm newly introduced syntax against current official
documentation.

## Table of contents

- [Cross-tool reconnaissance](#cross-tool-reconnaissance)
- [Mechanical duplicate-edge audit](#mechanical-duplicate-edge-audit)
- [Mechanical caller-rewrite audit](#mechanical-caller-rewrite-audit)
- [Mechanical developer-setup audit](#mechanical-developer-setup-audit)
- [Mechanical project-isolated runtime audit](#mechanical-project-isolated-runtime-audit)
- [mise](#mise)
- [hk and Pkl](#hk-and-pkl)
- [ast-grep](#ast-grep)
- [React Doctor](#react-doctor)
- [Oxc migration state machine](#oxc-migration-state-machine)
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
only to make a command locally available. In a bootstrap repository, the
absence of a pre-existing candidate-tool pin is not itself a blocker: verify a
compatible release from current official sources and establish one checked-in
authority as part of adoption. Do not guess a version when it cannot be
verified. For hk/Pkl bootstrap specifically, if official lookup is unavailable,
an exact version from each locally resolved executable plus the same version's
current help output is valid evidence for pinning and for the commands and
options that help actually exposes. Record executable paths and probes, and do
not extrapolate beyond that output.

Treat a command as repository-owned when its checked-in dependency or
repository tool declaration, configuration, and setup path establish it at the
intended ownership boundary. A missing local executable blocks execution
evidence for foundational mise, hk/Pkl, and applicable standalone React Doctor
graphs; it does not negate current-doc-verified syntax. Oxlint/Oxfmt semantic
enforcement is stricter: apply the
[Oxc migration state machine](#oxc-migration-state-machine), which requires
configuration parsing and a narrow smoke probe before even a parity route may
remain. Guidance prose and familiar ecosystem conventions alone do not prove
that a command exists. When focused validation reveals an unsupported command
or unresolved version, remove the speculative integration and classify it as
blocked. Never report an unavailable semantic probe as passing.

## Mechanical duplicate-edge audit

Run this audit before editing and again against the final files. It is a
required ownership proof, not a sampling exercise:

1. Parse the root `package.json` and emit every script name with its complete
   command body. Do not select only familiar names.
2. Resolve the repository's mise task graph and emit every task name with every
   command it runs, including array and multiline commands and included task
   configuration. If task resolution is unavailable, parse every checked-in
   mise task source and mark resolution itself blocked; do not call the audit
   passing.
3. Identify every package-manager invocation by which a mise command runs a
   root script, including `npm run`, `pnpm run`, `yarn`, and `bun run` forms.
   Record one ledger row per edge rather than deduplicating by script name.
4. Search checked-in, non-generated repository files for every root script's
   callers. Treat each executable checked-in caller as editable migration scope,
   not retention evidence. Before deleting any conventional root command,
   classify package publication metadata, contributor and release
   documentation, hosting and IDE contracts, and named downstream interfaces.
   Retain the name only for a package-manager-defined automatic lifecycle, a
   concretely evidenced public compatibility surface, or a genuinely external,
   uneditable caller whose compatibility cannot migrate. Exclude the root
   manifest's own definition and the mise edge under review. A familiar name,
   undocumented convention, interactive habit, or checked-in CI is not
   evidence. Classify an orchestrator-selected workspace leaf separately at its
   leaf boundary.
5. Move each ordinary root task's command body directly into mise, rewrite its
   checked-in callers to the mise task, and remove the root script. Preserve
   working directory, environment, argument forwarding, command order, exit
   behavior, and whether the route is read-only or mutating. When a lifecycle
   or evidenced public/external compatibility exception applies, retain only a
   thin root-to-mise entry point, not a second implementation. Checked-in
   executable callers still migrate to mise directly, and mise never delegates
   back to the wrapper.
   Re-enumerate both inventories after editing so renamed or indirect duplicate
   edges cannot escape review.

Use a ledger with at least these columns:

| Root script | Complete body | Mise task and edge | Publication, docs, hosting/IDE, downstream, lifecycle, or external compatibility evidence | Owner | Disposition |
| --- | --- | --- | --- | --- | --- |

Also include a separate complete `mise task -> command` inventory so a task
with no package-script edge is still accounted for. The audit passes only when
both inventories are complete, no mise task delegates to an ordinary root task
script, and every retained root entry has concrete lifecycle, public-interface,
or external/uneditable compatibility evidence and no second implementation.

When the root `package.json` has `"private": true`, default the `dev`, `build`,
`test`, `lint`, `format`, `check`, `fix`, and `doctor` families—including their
colon-qualified variants—to mise ownership. Private roots are commonly
orchestration surfaces, so these names do not establish package lifecycle
ownership. Move their bodies into mise, rewrite checked-in callers, and delete
an unevidenced name. Before deletion, complete the publication metadata,
contributor/release documentation, hosting/IDE, and downstream-contract
classification. Retain an evidenced name only as a thin root-to-mise wrapper
for a package-manager lifecycle, public compatibility surface, or genuinely
external/uneditable contract. Do not call `test`, `build`, or their
`pre*`/`post*` companions automatic merely because a developer can run the base
command; cite the exact package-manager lifecycle rule when relying on
automatic execution.

Do not apply the private-root default blindly to workspace leaves. A leaf
script may remain when a checked-in orchestrator such as Turbo, Nx, Lage, or a
workspace foreach command actually selects that script in the package. Cite
the orchestrator configuration or invoking command and the selected leaf task.
Mere workspace membership or matching names across packages is insufficient.

## Mechanical caller-rewrite audit

Run this audit before removing root scripts and again against the final
checked-in files. It proves that editable callers migrated with ownership:

1. From the initial root-script ledger, map every ordinary root task moved to
   mise to its owning mise task. Enumerate every executable checked-in caller,
   including CI workflows, hook configuration, task configuration, shell
   helpers, and nested automation. Record the caller path, working directory,
   environment, arguments, ordering, and mutation behavior.
2. Rewrite each editable caller to invoke `mise run <task>` directly while
   preserving those semantics. In established CI, update every applicable
   workflow step to use the same mise read-only tasks developers run locally
   and preserve the repository's established mise setup and provider policy.
   A checked-in workflow's existence never justifies keeping `npm run`,
   `pnpm run`, `yarn run`, `yarn <script>`, `bun run`, or another
   package-manager form for a mise-owned ordinary root task.
3. Before deleting a conventional root name, classify package publication
   metadata, contributor/release documentation, hosting/IDE contracts, and
   named downstream interfaces. Retain a root package-script entry only when
   its exact name is required by a package-manager-defined automatic lifecycle,
   a proven public compatibility surface, or a genuinely external, uneditable
   caller. Cite the concrete evidence and make the retained entry a thin
   delegation to the mise task. Checked-in executable callers must still
   migrate directly, and mise must never delegate back to the wrapper.
4. Scan all final checked-in, non-generated executable files for every mapped
   task name in `npm run`, `npm run-script`, `pnpm run`, package-manager
   shorthand, `yarn run`, `yarn <script>`, and `bun run` forms. Exclude only the
   root manifest definition and an evidenced retained compatibility entry
   itself. Resolve wrappers recursively; a shell helper that hides the
   package-manager invocation is still a match.
5. Resolve the final developer read-only entry points and established CI jobs.
   Require them to reach the same mise task names, commands, working
   directories, and mutation behavior. Fail if any checked-in caller remains on
   a package-script route, any caller rewrite changes semantics, any retained
   wrapper has a second implementation, or any retained root name lacks the
   completed compatibility classification and concrete evidence.

Use a ledger with at least these columns:

| Former root task | Owning mise task | Checked-in caller and original edge | Rewritten direct mise edge | Preserved semantics | Publication/docs/hosting/downstream/lifecycle/external compatibility entry | Final package-manager caller scan | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |

The audit passes only with a complete caller inventory and zero final
package-manager invocations of mise-owned ordinary root tasks from checked-in
callers. Passing CI or an unchanged command result cannot compensate for an
unmigrated caller.

## Mechanical developer-setup audit

Run this audit against the final files independently of the duplicate-edge
audit. It is a hard gate on developer setup:

1. Identify the one developer `setup` task from the resolved mise task graph.
   Expand its complete command sequence in execution order, recursively
   following task dependencies and invocations, included mise task sources,
   package-manager script invocations, and checked-in shell or helper commands.
   Record each delegation edge and the source path that defines it. A dynamic
   or unavailable edge that cannot be resolved to its effective command makes
   this audit fail; task discovery or top-level TOML text is not a substitute.
2. Determine the repository package manager from concrete evidence such as the
   manifest `packageManager` field and matching lockfile. Resolve conflicts
   before judging setup. Select that manager's ordinary developer install
   command, such as `npm install`, `pnpm install`, `bun install`, or
   `yarn install`; do not select an install merely because it appears in the
   task.
3. Inspect every command in the resolved developer setup path. Require the
   selected ordinary install and reject `npm ci`, `--frozen-lockfile`,
   `--frozen`, `--immutable`, `--lockfile-only`, `--package-lock-only`, and
   equivalent frozen, immutable, lockfile-only, or CI-only semantics, including
   those hidden behind a delegated task, package script, environment wrapper,
   or checked-in helper. Do not accept a later ordinary install as compensation
   for an earlier prohibited install.
4. Enumerate every remaining repository route that uses those reproducible
   install semantics. For each route, search checked-in CI configuration for a
   concrete caller and cite its path, job, and command edge. The route must be
   separate from developer `setup`. An unused task named `ci`, documentation,
   or general reproducibility intent is not established CI evidence. When the
   repository has no established CI seam, remove the CI-only install route or
   report the implementation as failing; do not invent a workflow to legitimize
   it.
5. Rerun the expansion and prohibited-semantics scan after all edits. The audit
   passes only when the developer setup graph is fully resolved, contains the
   evidence-selected ordinary install, contains no prohibited install
   semantics, and every retained reproducible-install route has an established
   CI caller.

Attach a table like this to the final report:

| Developer setup task | Delegation chain and source paths | Fully resolved command sequence | Package-manager evidence | Required ordinary install | Prohibited-semantics scan | Separate reproducible-install routes and established CI callers | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |

List the exact matched tokens or state `none`; do not summarize the scan as
"setup looks ordinary." Mark unresolved edges, conflicting package-manager
evidence, a missing ordinary install, any prohibited developer-path match, or
an unevidenced retained CI-only route as `FAIL`. Parsed configuration, an
otherwise successful setup, or passing downstream checks cannot compensate.

## Mechanical project-isolated runtime audit

Run this audit against the final project config as an independent hard gate:

1. Start from the fully resolved developer `setup` graph produced by the
   developer-setup audit. Enumerate every executable it invokes, including
   delegated task and helper commands. For each executable, identify the mise
   tool or runtime that provides it; explicitly map the selected package
   manager to both its own version authority and the runtime that provides or
   executes it.
2. Trace every provider to a versioned declaration in checked-in project mise
   configuration. Follow an include only when the project config intentionally
   names it and the included config is also checked in at a project-owned path.
   Record the complete include chain and reject implicit user, system, or global
   config sources.
3. Validate mise task discovery and resolve the complete setup task with
   user/global configuration disabled using the currently documented isolation
   mechanism. Do not execute mutating install commands merely to inspect them.
   If isolated execution is unavailable, produce an equivalent exhaustive
   inventory of active config sources, task sources, executable-to-provider
   mappings, and provider pins that proves no global source contributes.
4. Compare isolated and ordinary resolution. A globally installed executable
   or shim may establish availability but cannot fill a missing project
   declaration. A manifest `packageManager` field may identify the selected
   package manager, but it cannot replace the checked-in mise pin for the
   package manager or the runtime that provides or runs it.
5. Rerun the inventory after edits. Fail if task discovery or setup resolution
   depends on global config; any executable provider is unresolved or
   ambiguous; any include is implicit, untracked, or outside project intent; or
   the package manager, its runtime, or another setup provider lacks a project
   pin.

Attach this evidence to the report:

| Setup executable | Providing mise tool/runtime | Project pin | Checked-in config path and include chain | Isolated resolution evidence | Global contribution | Verdict |
| --- | --- | --- | --- | --- | --- | --- |

The audit passes only when every row resolves from checked-in project mise
intent and the isolated task graph is complete. Successful ordinary task
discovery, an existing global shim, or a working setup on the current machine
cannot compensate for a missing project runtime pin.

## mise

### Detect

Look for `mise.toml`, `.mise.toml`, split mise configuration, `mise.lock`,
legacy runtime files, task includes, environment directives, and CI setup.
Compare declared runtimes with package-manager metadata and workflow versions.

### Applicability

Every invocation supported by this skill adopts or reconciles mise as the
repository's developer setup and task entry point. Integrate an established
runtime manager behind mise without duplicating its version authority. Do not
mark mise skipped, inapplicable, or blocked merely because the repository is
small, another runtime manager exists, or mise is not locally executable.

### Integrate

- Declare only tools the repository actually needs.
- Declare every executable required by developer setup, including the selected
  package manager and its provider runtime, in checked-in project mise config or
  an intentional checked-in project config included from it.
- Preserve the package manager selected by manifests and lockfiles.
- Give tasks stable names for developer setup, read-only checks, and explicit
  fixes.
- Use the package manager's ordinary install command for developer setup. Do
  not use frozen, immutable, lockfile-only, or CI-only flags there. For example,
  select `npm install`, `pnpm install`, `bun install`, or `yarn install` from
  repository evidence. Keep a frozen CI install in its established CI seam
  only.
- Put new repository automation directly in mise tasks. Do not create a root
  package script solely as a mise delegate.
- Move ordinary root task implementations into mise and rewrite all checked-in
  executable callers, especially CI, to invoke the mise task directly. Before
  deleting a conventional root name, classify publication metadata,
  contributor/release documentation, hosting/IDE contracts, and named
  downstream interfaces. Retain an evidenced lifecycle or public/external
  compatibility name only as a thin root-to-mise wrapper. A root script's
  existence, conventional name, existing mise delegation, or checked-in
  executable caller is not evidence. Preserve an orchestrator-selected
  workspace leaf at the leaf boundary; do not copy its body into TOML.
- Apply the [mechanical duplicate-edge audit](#mechanical-duplicate-edge-audit)
  and [mechanical caller-rewrite audit](#mechanical-caller-rewrite-audit) to the
  final graph. In a private root, move conventional command implementations
  into mise, migrate checked-in executable callers, and classify public
  compatibility before deleting names; preserve orchestrator-selected
  workspace leaves at their package boundary.
- Use `mise install` and `mise lock` according to the repository's chosen
  version policy; distinguish intentional floating tools from reproducible pins.
- Keep environment loading and setup side effects explicit.

### Validate

Inspect parsed configuration, resolved tool versions, and task discovery. Run
the narrow tasks first, then the public aggregate. Confirm a fresh setup path
installs declared tools without silently replacing the package manager. Repeat
task discovery and setup resolution with global config disabled, or prove an
equivalent isolated config inventory; fail on a missing project runtime pin.

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

Every Git repository supported by this skill adopts or reconciles hk as its
staged-file-aware policy surface and uses Pkl as hk's configuration language.
Only a non-Git directory may mark hk/Pkl inapplicable. The absence of an
existing hook policy or a locally executable hk does not make adoption
optional.

### Integrate

- Declare hk and Pkl in the repository environment.
- Prefer current official sources for bootstrap versions and syntax. If those
  sources are unavailable, resolve each local executable, capture its exact
  version, and inspect that version's current help for every introduced command
  and option. Pin only what those probes verify.
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
- Configure `commit-msg` to run hk's built-in validator exactly as
  `hk util check-conventional-commit {{commit_msg_file}}`.
- Check in the whole adoption graph together: exact mise pins, a compatible hk
  Pkl import/configuration, environment integration, setup installation,
  staged-file checks, and the Conventional Commit route. Prefer a current
  help-exposed initializer or generator and audit the generated configuration.
  If network, cache, or sandbox limits prevent import evaluation or hook
  installation, retain this current-doc- or version/help-verified graph and
  report those execution probes as blocked rather than omitting hk.

### Validate

Evaluate or load the Pkl configuration through hk, list or dry-run the relevant
hooks where supported, and run a narrow hook route. Resolve Git's configured
hooks path and inspect the expected hook entry points after installation. Pass
a temporary invalid commit-message file through the configured `commit-msg`
route and require a nonzero result; remove the file without creating a commit.

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

Adopt or reconcile React Doctor in every React workspace. Skip non-React
repositories and non-React packages instead of forcing a root-wide invocation.
A missing local executable blocks execution evidence, not a checked-in graph
whose version and syntax are verified by current documentation.

### Integrate

- Configure `oxlint-plugin-react-doctor` through Oxlint for fast rule-level
  feedback. Keep the standalone CLI for complete scans, reports, and
  project-level rules that are no-ops under plain Oxlint.
- Treat plugin enablement as an atomic owner-transfer transaction, not an
  additive configuration edit:
  1. Snapshot every effectively enabled `react/*` and `jsx-a11y/*` rule,
     including nested configs, overrides, CLI flags, scopes, and severities.
  2. Use the current plugin documentation or rule catalog to map every exact
     overlap. Record the plugin rule, all displaced built-in rules, effective
     scope and severity, selected owner, documentation evidence, and controlled
     violation in an overlap ledger. Never infer equivalence from names.
  3. Preserve the displaced built-in's effective severity under the selected
     `react-doctor/*` owner in the same scope. Explicitly set each displaced
     built-in rule to `off` in every scope that could enable it; deleting the
     rule or adding only a root-level `off` does not prove transfer.
  4. Leave non-overlapping built-in diagnostics unchanged and keep standalone
     CLI-only project diagnostics outside the ledger.
  5. Commit plugin registration, plugin rules, displaced-rule `off` entries,
     and any plugin dependency together only after all ledger rows can be
     proved.
- Apply the [preferred React diagnostic lifecycle](#preferred-react-diagnostic-lifecycle).
- Keep a full standalone scan as an explicit manual diagnostic when broader
  analysis is useful.
- Preserve repository-specific ignores and category or rule decisions.

### Validate

Validate the Oxlint plugin and standalone CLI from each intended React ownership
root. Check the full manual scan separately from the lifecycle routes. Use
one controlled overlap violation per ledger row. For each row, inspect the
effective configuration and command output to prove exactly one enabled owner,
exactly one emitted `react-doctor/*` diagnostic, no displaced built-in
diagnostic, and unchanged effective severity. Keep project-level CLI-only
results out of that equivalence claim. Then exercise the lifecycle probes
below.

If documentation does not resolve every enabled built-in rule, a scope or
severity cannot be preserved, or even one controlled proof is unavailable or
fails, abort the entire plugin transaction. Disable or unregister the plugin
and all plugin rules, remove a dependency introduced solely for the plugin, and
restore the inventoried built-in rules and severities as the sole owners. For a
pre-existing partial or duplicate plugin setup, reconcile to this built-in-only
rollback state rather than preserving the invalid overlap. Retain the
standalone React Doctor route when applicable and report plugin enablement as
blocked. Do not retain a merely parsed plugin graph under the usual
execution-unavailable exception: owner transfer requires complete proof.

### Cautions

Do not run from a monorepo root if that changes discovery or hides workspace
configuration. Treat `--scope changed` as base-relative filtering, not as hook
timing. After the plugin owner-transfer transaction passes or rolls back,
establish an acceptable baseline before enabling warning-level blocking;
otherwise keep that proven diagnostic-owner graph and record the standalone
lifecycle gate and its execution evidence as blocked instead of silently
weakening the gate.

## Oxc migration state machine

Apply this state machine independently to the inventoried lint and format
scopes. Never infer the route state from checked-in configuration alone.

### State 0: legacy authoritative

- Keep the legacy ESLint and Prettier read-only routes authoritative and
  blocking for every scope they currently own.
- Keep those routes reachable from the normal read-only aggregate and
  applicable hooks. Keep fixers explicit and separate from the read-only owner.
- Record each route's exact scope plus these labels:
  `authoritative`, `blocking`, and `read-only` or `mutating`.
- Record the exact pending Oxlint/Oxfmt migration, parse, and smoke commands.
  Documentation-verified syntax does not advance the state.

### State 1: Oxc parity probe

Enter this state only after the new configuration parses and a narrow
repository-owned smoke probe executes successfully at the intended ownership
root.

- Expose the new Oxlint or Oxfmt check under a distinct parity task name.
- Label it `parity-only`, `non-authoritative`, `non-blocking`, and `read-only`.
- Keep it out of the normal blocking aggregate, normal hooks, and blocking CI.
  Do not add an Oxc fixer to normal hooks.
- Keep the legacy read-only route authoritative and blocking for all existing
  scopes. A passing parity smoke is permission to compare, not equivalence.
- If parsing or the smoke probe cannot run or fails, do not enter this state:
  remove or omit the new enforcement task, hook, and CI route; leave the
  predecessor as sole owner; and report the pending commands and blocker.

### State 2: atomic ownership transfer

Advance only after controlled equivalence covers the inventoried configuration,
ignores, globals, overrides, rules and severities, processors/plugins, and file
types. For formatting, compare controlled output and prove the chosen writer
idempotent. For linting, exercise controlled clean and violating samples and
compare diagnostic scope and severity.

- Transfer proved supported scopes to authoritative, blocking Oxc routes and
  their explicit fix routes in one change.
- Remove those supported scopes from legacy primary execution in the same
  change; do not run both owners on the normal path.
- Retain legacy execution only for individually named unsupported semantics and
  keep each retained scope reachable from a documented blocking enforcement
  path.
- Update the matrix and report with one row per route:

  | Route | Exact scope | State | Authority | Blocking | Mutation | Enforcement path | Evidence |
  | --- | --- | --- | --- | --- | --- | --- | --- |

The state gate fails if a required legacy owner is unreachable before transfer,
if a parity route becomes blocking or enters normal hooks, if supported legacy
scope remains on the primary path after transfer, or if a retained unsupported
scope lacks a documented blocking route.

## Oxlint

### Detect

Inspect root and nested Oxlint configs, package scripts, workspace task routing,
ESLint configs, plugins, generated-file exclusions, type-aware settings, and
CI flags. Inventory ESLint configuration, ignores, rules, severities, globals,
overrides, processors, plugins, and file types. Determine which semantics
Oxlint does not cover.

### Applicability

Use Oxlint for supported JavaScript and TypeScript linting. Keep complementary
lint tooling for rules, processors, plugins, or file types that cannot be
preserved.

### Integrate

- Run the current `@oxlint/migrate` facility as an audited starting point, not
  as authority to delete the previous config.
- Follow the [Oxc migration state machine](#oxc-migration-state-machine).
  Without a successful configuration parse and narrow repository-owned smoke,
  leave ESLint as sole authoritative owner and add no Oxlint enforcement path.
  After those probes, keep Oxlint parity-only until controlled equivalence
  permits atomic scope transfer.
- Review migrated rules, severity, environments, ignores, plugins, and nested
  overrides against the baseline.
- Name every unsupported processor, plugin, file type, or rule and route only
  that scope through complementary ESLint after transfer. Remove obsolete
  supported ESLint configuration and dependencies in the atomic transfer.
- Preserve orchestrator-selected workspace lint scripts. Move ordinary root
  lint ownership to mise, rewrite checked-in callers directly to the mise task,
  and retain a root entry only as an evidenced thin compatibility wrapper.
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
format scripts. Inventory Prettier configuration, ignore rules, plugins, and
file types before changing ownership.

### Applicability

Use Oxfmt only for file types and semantics it supports in the target
repository. Preserve complementary formatters where unsupported content or
behavior remains.

### Integrate

- Start the migration with `oxfmt --migrate prettier`, then audit the generated
  configuration and migrated ignores against the Prettier baseline.
- Follow the [Oxc migration state machine](#oxc-migration-state-machine).
  Without a successful configuration parse and narrow repository-owned smoke,
  leave Prettier as sole authoritative owner and add no Oxfmt enforcement path.
  After those probes, keep Oxfmt parity-only until controlled equivalence
  permits atomic scope transfer.
- Carry forward generated, vendored, build-output, and tool-owned exclusions.
- Name unsupported Prettier plugins or file types and keep only those scopes on
  a complementary formatter route after transfer. Remove obsolete supported
  Prettier configuration, ignores, and dependencies in the atomic transfer.
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
Do not delete Prettier configuration or ignores until migrated behavior and all
unsupported scopes are accounted for.

## Composition and evidence

Prefer this fix order when all stages apply:

1. explicit ast-grep structural rewrites;
2. Oxfmt writes;
3. Oxlint fixes;
4. read-only ast-grep, React Doctor, Oxlint, and Oxfmt checks.

Apply Oxfmt writes and Oxlint fixes only after their scopes reach State 2.
Before equivalence, keep parity probes read-only and outside normal hooks.
Change the order only when repository evidence shows a different stable graph,
then prove the chosen graph is idempotent. hk should orchestrate staged or
changed files; mise should expose reproducible entry points; CI should call the
same read-only mise tasks directly without hook-only mutation.

### Preferred React diagnostic lifecycle

Use distinct ownership by lifecycle when the React Doctor and Oxlint rows apply:

1. **Pre-commit:** before Oxc transfer, run the authoritative legacy read-only
   staged route and keep parity-only Oxlint out. After transfer, run staged-file
   Oxlint with `oxlint-plugin-react-doctor` only after its atomic owner-transfer
   transaction passes, plus adopted ast-grep scans. If the plugin transaction
   rolls back, use the restored Oxlint built-in owners. Keep standalone React
   Doctor out of this fast path. If ast-grep is skipped, omit it rather than
   creating placeholder configuration. Treat Oxfmt as a separate formatter
   policy and never add a pre-equivalence fixer.
2. **Pre-push:** run one repository-owned standalone React Doctor command with
   `--scope changed --blocking warning`.
3. **PR CI:** invoke that exact pre-push mise task, from the same ownership root
   and with equivalent base-branch semantics. Do not route checked-in CI through
   a root package script. A proven orchestrator-selected workspace leaf may
   remain below the mise task; a lifecycle, public-interface, or
   external/uneditable compatibility wrapper may remain for its narrow surface
   but is not the CI route.

Treat this lifecycle as the default. Preserve a different established route
only when the matrix records concrete repository evidence for the deviation
and retains fast Oxlint feedback from the transaction's proven plugin or
built-in owners plus the standalone CLI's broader coverage.

Validate the lifecycle with controlled probes:

- prove pre-commit passes only eligible staged files to Oxlint and ast-grep and
  does not launch standalone React Doctor;
- prove one warning makes the shared pre-push/CI command exit nonzero and a
  clean changed scope exits zero;
- prove pre-push and PR CI resolve to the same command, working directory,
  blocking threshold, and comparison base;
- ensure CI fetches or otherwise exposes the comparison base required by
  `--scope changed`.

Extend CI only through a provider, action-version policy, and validation route
already established by the repository. If the repository has no CI convention,
record the missing seam as blocked; do not create a workflow whose actions and
syntax cannot be verified from current documentation and local checks.

Report exact commands and their mutation behavior. Separate config validation,
focused success, controlled failure, hook installation, hook execution, and CI
wiring evidence. Remove tool dependencies and configurations that no exercised
command owns, unless they retain a named complementary responsibility. Record
skipped tools as decisions, not omissions.

Attach the final mechanical duplicate-edge ledger and complete resolved mise
command inventory to the report. A passing toolchain report must not retain any
mise-to-ordinary-root-task edge, an unclassified conventional command, or an
evidenced wrapper with a second implementation, even when every command
executes successfully.

Attach the final mechanical caller-rewrite ledger and zero-match scan. A
passing report must show every checked-in executable caller, especially CI,
using the owning mise task directly and every retained root entry limited to an
evidenced lifecycle, public-interface, or external/uneditable compatibility
surface.

Attach the final mechanical developer-setup audit table as well. A passing
toolchain report must show the fully resolved developer setup path, its
repository-selected ordinary install, a clean prohibited-semantics scan, and
CI-caller evidence for every separate retained reproducible-install route.

Attach the final mechanical project-isolated runtime audit table. A passing
report must trace every setup executable—including the package manager and its
runtime—to checked-in project mise intent and prove task discovery plus setup
resolution without accidental global config contribution.
