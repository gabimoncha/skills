---
name: bootstrap-mise-oxc-and-ast-grep
description: Bootstrap or improve a repository's mise, hk/Pkl, ast-grep, React Doctor, Oxlint, and Oxfmt setup
disable-model-invocation: true
---

# Bootstrap Mise, Oxc, and ast-grep

Build a repo-native toolchain around exactly mise, hk/Pkl, ast-grep, React
Doctor, Oxlint, and Oxfmt. Use the **bootstrap** branch when the repository lacks
the toolchain; use the **reconcile** branch when any of it already exists. In
both branches, preserve working commands and improve the smallest coherent
seam.

For this skill, every supported invocation must adopt or reconcile mise and
provide one ordinary-install developer `setup` task. Every supported Git
repository must also adopt or reconcile hk/Pkl, staged checks, setup-owned hook
installation, and Conventional Commit validation. These are invariants, not
benefit-based applicability choices. A non-Git directory may mark hk/Pkl
inapplicable; a Git repository may not.

Read [references/tool-patterns.md](references/tool-patterns.md) before designing
or changing the toolchain. Verify current syntax in official documentation
before introducing a command or option that the repository does not already
exercise, except for the exact locally resolved hk bootstrap fallback described
below.

## Non-compensable simplicity contract

Give each capability one authoritative implementation. A missing local
executable is not a reason to omit a checked-in developer setup path when the
repository identifies its package manager and the complete task graph parses.
Nor is unavailable execution a reason to omit a complete checked-in mise,
hk/Pkl, or applicable standalone React Doctor graph whose versions and syntax
are verified by current documentation. In that case, implement the graph and
label the unavailable execution evidence as blocked. This allowance does not
apply to semantic Oxlint/Oxfmt enforcement: follow the deterministic Oxc
migration state machine below. It also does not weaken the React Doctor plugin's
atomic owner-transfer proof.
Do not compensate for missing tools by adding duplicate package scripts,
parallel configs, placeholder rules, or CI-only install semantics to developer
setup. New repository automation that mise can express belongs directly in
`mise.toml`. Before deleting a conventional root command, classify package
publication metadata, contributor and release documentation, hosting and IDE
contracts, and named downstream interfaces. Retain the root name only for a
package-manager-defined automatic lifecycle, a concretely evidenced public
compatibility surface, or a genuinely external, uneditable caller whose
compatibility cannot be migrated; keep it as a thin root-to-mise wrapper rather
than a second implementation. A checked-in executable caller—including CI,
hooks, and repository scripts—is editable migration scope, not retention
evidence: rewrite it to call the mise task directly. A script's presence,
familiar name, or undocumented convention is not compatibility evidence.
Preserve an orchestrator-selected workspace leaf at that leaf boundary, but do
not use it to justify a duplicate ordinary root task implementation.

Before any completion claim, perform the mechanical duplicate-edge audit in
[Tool Patterns](references/tool-patterns.md#mechanical-duplicate-edge-audit).
Enumerate every root `package.json` script and every resolved mise task command,
then account for every mise-to-root-script edge. Reject every edge from mise to
an ordinary root task script: a lifecycle, public-interface, or external
compatibility entry must delegate into mise, never make mise delegate back into
the root script. This audit is non-compensable: parsed configuration, passing
tasks, compatibility, or a conventional script name cannot substitute for a
complete ledger with zero unexplained edges.

Perform the mechanical caller-rewrite audit in
[Tool Patterns](references/tool-patterns.md#mechanical-caller-rewrite-audit)
as a separate final hard gate. For every task moved to mise, rewrite every
checked-in executable caller—especially CI—from `npm`, `pnpm`, `yarn`, or `bun`
root-script invocation to the owning mise task. Retain a root compatibility
entry only for an automatic package-manager lifecycle, a cited public
compatibility surface, or a genuinely external, uneditable caller that cannot
migrate. Checked-in executable callers still migrate, and mise never delegates
back to the wrapper. The final checked-in caller scan must contain zero
package-manager invocations of mise-owned root tasks.

Also perform the independent mechanical developer-setup audit in
[Tool Patterns](references/tool-patterns.md#mechanical-developer-setup-audit)
against the final files. Fully resolve the developer `setup` task through task
dependencies, task invocations, package-script delegations, and checked-in
helper commands. Require the ordinary install selected by repository
package-manager evidence, and reject `npm ci`, frozen, immutable,
lockfile-only, or equivalent CI-only install semantics anywhere in that
resolved developer path. A frozen or immutable install may remain only on a
separate route with a searched, established CI caller. Attach the resolved
setup command sequence, package-manager evidence, rejected-token scan, and CI
separation evidence to the report. This audit is non-compensable: an unresolved
delegation or noncompliant install is a hard failure even when setup parses or
other validation passes.

Finally, perform the non-compensable project-isolated runtime audit in
[Tool Patterns](references/tool-patterns.md#mechanical-project-isolated-runtime-audit).
Every executable reached by the resolved developer `setup` task—including the
selected package manager and the runtime that provides or runs it—must trace to
a versioned declaration in checked-in project mise configuration or an
intentional checked-in project config included from it. Accidental user/global
mise state, a globally working shim, and package-manager manifest metadata
without its runtime pin are not evidence. Before completion, validate mise task
discovery and setup resolution with global configuration disabled, or provide
an equivalent isolated inventory proving the same config provenance for every
executable. An unresolved provider or missing runtime pin is a hard failure.

## Optional skill delegation

Check the active skill catalog for `$ast-grep`. When it is available, use it to
design, debug, and test ast-grep searches and rules for any adopted or improved
ast-grep row. Keep adoption, ownership, command routing, hook/CI integration,
and cross-tool ordering in this skill. If `$ast-grep` is unavailable, continue
with this skill's ast-grep patterns and current official documentation; do not
hard-code a checkout-specific path or block unrelated tool rows.

## Workflow

1. Establish the baseline.
   - Read repository guidance, manifests, lockfiles, CI, hooks, nested workspace
     guidance, and the dirty state.
   - Inventory existing setup, check, fix, hook, and CI commands. Mark each as
     read-only or mutating and record reproducible pre-existing failures.
   - Resolve every executable in the developer setup graph to its providing
     tool/runtime and checked-in project mise declaration. Record intentional
     project-config include chains separately from user/global mise state.
   - Mechanically enumerate every root manifest script and every resolved mise
     task command. Search checked-in non-generated callers, classify each as
     editable migration scope, and record any automatic package lifecycle,
     public compatibility surface, external/uneditable contract, or
     workspace-leaf orchestrator requirement. For each conventional root
     command, inspect publication metadata, contributor/release documentation,
     hosting/IDE contracts, and named downstream interfaces. Do not treat names
     such as `build` or `test` as evidence by themselves.
   - Select **bootstrap** only when no meaningful setup exists; otherwise select
     **reconcile** and treat existing behavior as evidence.

   Completion criterion: the branch choice, authorities, dirty files, public
   commands, mutation boundaries, baseline failures, and initial command-edge
   ledger are explicit.

2. Create this six-row decision matrix before editing:

   | Tool | Applicability | Ownership boundary | Version source(s) | Baseline | Decision | Integration seam | Validation |
   | --- | --- | --- | --- | --- | --- | --- | --- |
   | mise |  |  |  |  | adopt / improve / retain |  |  |
   | hk/Pkl |  |  |  |  | adopt / improve / retain; skip only when non-Git |  |  |
   | ast-grep |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | React Doctor |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | Oxlint |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | Oxfmt |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |

   Completion criterion: every cell is resolved from repository evidence, and
   every skip or block has a concrete reason. The mise decision is always
   `adopt`, `improve`, or `retain`. In a Git repository, the hk/Pkl decision is
   also always `adopt`, `improve`, or `retain`; environment limitations belong
   in Validation and do not change applicability or implementation decisions.

3. Design the repo-native command graph.
   - Define one developer `setup` path, read-only checks, explicit fixes,
     staged-or-changed hook paths, and CI paths.
   - Declare every setup executable and its provider runtime in checked-in
     project mise configuration or an intentional checked-in project include.
     Pin the selected package manager and its runtime from repository evidence;
     do not rely on their presence in global mise state.
   - Make developer setup use the package manager's ordinary install command,
     without frozen, immutable, lockfile-only, or CI-only flags. Keep an
     established reproducible CI install separate; do not invent one when CI
     has no owner.
   - Implement new repository automation directly as mise tasks. Do not add a
     package script merely so mise can delegate to it. Put each ordinary root
     task implementation in mise and rewrite checked-in callers, including CI,
     hooks, and repository scripts, to invoke the mise task directly. Retain a
     root script only when the baseline classification proves that its exact
     name is required by an automatic package-manager lifecycle, public
     compatibility surface, or genuinely external, uneditable caller; make
     that script a thin root-to-mise wrapper. Mere manifest presence, a
     conventional name, an existing mise-to-script edge, or any checked-in
     executable caller is insufficient retention evidence. Preserve a proven
     orchestrator-selected workspace leaf without duplicating its internals in
     mise.
   - When the root manifest is private, treat the `dev`, `build`, `test`, `lint`,
     `format`, `check`, `fix`, and `doctor` script families as mise-movable by
     default, but do not delete their public names before completing the
     compatibility classification. Move each implementation into the owning
     mise task; preserve its working directory, environment, arguments,
     ordering, and mutation semantics; rewrite all checked-in executable
     callers to mise; then remove an unevidenced name or retain an evidenced
     thin wrapper. Retain a workspace leaf script only when a named orchestrator
     such as Turbo actually selects that leaf; cite the orchestrator route
     rather than the leaf's familiar name.
   - Keep setup, check, and fix semantics distinct; a command named `check`
     must not rewrite tracked files.

   Completion criterion: each public entry point maps to one implementation,
   its mutation behavior is unambiguous, developer setup is not a CI install,
   every conventional command has a completed compatibility classification,
   every retained root script is an evidenced thin wrapper, and both
   command-edge and checked-in caller ledgers have zero unexplained edges.

4. Implement incrementally in matrix order.
   - Reconcile runtime and tool versions before adding mise tasks. Treat a
     missing project pin for any setup executable's provider runtime as an
     implementation failure, even when a global shim currently resolves it.
   - Bootstrap hk/Pkl from current official version and syntax evidence. When
     official lookup is unavailable, an exact version from each locally
     resolved executable plus that version's current `--help` output for every
     introduced command or option is sufficient bootstrap evidence. Record the
     evidence used; when using local evidence, also record executable paths,
     exact versions, and help probes. Do not infer a missing version or
     unsupported syntax.
   - In every Git repository, once those inputs verify the versions and
     commands, check in the complete hk graph: exact mise pins, compatible hk
     Pkl import/configuration,
     `HK_MISE=1` where mise resolves hook tools, setup-owned
     `hk install --mise`, staged check routing, and a `commit-msg` route using
     exactly `hk util check-conventional-commit {{commit_msg_file}}`. Use a
     help-exposed initializer or generator when available, then audit its
     output. An environment-only inability to fetch dependencies, evaluate an
     uncached import, or install hooks blocks execution proof, not this
     current-doc- or help-verified checked-in graph.
   - Add ast-grep only for a real structural use case with tested rules; use
     `$ast-grep` for rule authoring and debugging when that skill is available.
   - Adopt or reconcile React Doctor in every React scope and skip it outside
     React scopes. When current documentation verifies its version and syntax,
     a missing executable blocks its probes, not the applicable checked-in
     graph. Treat standalone React Doctor adoption separately from enabling its
     Oxlint plugin: plugin enablement is provisional until the atomic
     owner-transfer transaction in the next step passes.
   - Inventory ESLint and Prettier scopes and apply this deterministic Oxc
     migration state machine:
     1. Before equivalence, keep the legacy read-only routes as the
        authoritative, blocking owners for every existing scope and keep them
        reachable from the normal aggregate and applicable hooks. Keep legacy
        fixers explicit and separate.
     2. Use `@oxlint/migrate` and `oxfmt --migrate prettier` as audited starting
        points. Add a named Oxc route only after its configuration parses and a
        narrow repository-owned smoke probe succeeds. Label it
        non-authoritative, non-blocking, parity-only, and read-only; keep it out
        of normal hooks and the primary blocking graph, and add no Oxc fixer to
        normal hooks. If either minimum probe cannot run or fails, leave the
        predecessor as sole owner, add no new Oxc enforcement path, and record
        the exact pending migration and smoke commands.
     3. After controlled equivalence proves the inventoried scopes, transfer
        supported scopes atomically to authoritative, blocking Oxc routes.
        Remove those scopes from legacy execution in the same change. Retain
        legacy execution only for named unsupported processors, plugins, file
        types, rules, or formatting semantics, and keep each retained scope
        reachable from a documented blocking enforcement path.
   - Label every lint and format route in the decision matrix with exact scope,
     `authoritative` or `parity-only`, `blocking` or `non-blocking`, and
     `read-only` or `mutating`.
   - Validate each tool at its ownership boundary before proceeding.

   Completion criterion: every adopted or improved row has focused validation,
   with each probe marked passing, failing, or blocked. If an unsupported
   command or unresolved version makes the graph speculative, restore those
   speculative edits and record the implementation blocker. Do not restore a
   current-doc-verified foundational graph merely because a dependency, import,
   hook installer, or non-semantic probe cannot run. Keep setup-backed mise
   integration and, for Git repositories, the complete hk graph. Keep
   applicable standalone React Doctor integration. For Oxlint/Oxfmt, the state
   machine overrides the blocked-graph allowance: without configuration parse
   and narrow smoke evidence, retain no new enforcement path. Never describe an
   unrun semantic probe as passing.

5. Reconcile overlap and ordering.
   - Assign one owner to each file class and diagnostic.
   - Make `oxlint-plugin-react-doctor` enablement one atomic owner-transfer
     transaction. Before editing, inventory every effectively enabled
     `react/*` and `jsx-a11y/*` rule across root config, nested config,
     overrides, and CLI flags. From current plugin documentation, create an
     exact overlap ledger containing the `react-doctor/*` rule, every displaced
     built-in rule, its effective scope and severity, the selected owner, and a
     controlled violation for proof. Do not infer mappings from similar rule
     names.
   - Commit the transaction only when the ledger is complete. Preserve each
     displaced built-in rule's effective severity on the selected
     `react-doctor/*` owner in the same scope, and explicitly configure every
     displaced `react/*` or `jsx-a11y/*` rule as `off` everywhere it could
     otherwise be enabled; removal or one root-level `off` is insufficient
     when another scope re-enables it. Keep non-overlapping built-ins and
     project-level standalone React Doctor rules separate.
   - Prove every ledger row both statically and dynamically: the effective
     configuration has exactly one enabled owner, and its controlled violation
     emits exactly one diagnostic from the selected `react-doctor/*` rule and
     none from displaced built-ins.
   - If any enabled built-in lacks a documentation-backed overlap decision, any
     severity or scope cannot be preserved, or any controlled proof is blocked
     or fails, roll back plugin enablement entirely. Disable or unregister the
     plugin and its rules, remove a newly added plugin dependency, and restore
     the built-in rules at their inventoried severities as the sole owners.
     Keep an applicable standalone React Doctor route and report plugin
     enablement as blocked. This rollback requirement overrides the general
     allowance to retain other current-doc-verified graphs when execution is
     unavailable.
   - Order structural fixes, formatting, lint fixes, and read-only checks so
     later stages stabilize rather than undo earlier output.
   - Preserve generated-file exclusions, nested configs, and rules that the new
     tools cannot represent.

   Completion criterion: no file class has competing writers, and running the
   fix graph twice produces no second diff on the controlled sample. Every
   retained tool dependency or config has an exercised command or a documented
   complementary responsibility. An enabled React Doctor plugin has a complete
   overlap ledger and one passing controlled diagnostic proof per row;
   otherwise no plugin rule or dependency remains active and the built-ins are
   restored as sole diagnostic owners.

6. Wire hooks and CI.
   - Keep hooks staged or changed-file aware when supported; reserve broader
     checks for CI or explicit full-check commands.
   - Before Oxc equivalence, keep the authoritative legacy read-only route in
     applicable normal hooks and keep the parity-only Oxc route out. After
     transfer, route supported scopes through Oxc and only named unsupported
     scopes through the legacy owner.
   - For React scopes, apply the preferred diagnostic lifecycle in
     [Composition and evidence](references/tool-patterns.md#composition-and-evidence);
     record any repository-evidenced deviation in the matrix.
   - Install hk through the repository's setup path and verify the expected Git
     hook files exist and invoke hk.
   - Verify `commit-msg` with a temporary invalid message whose check exits
     nonzero, then remove the fixture without attempting a commit.
   - Rewrite each checked-in CI step to invoke the same mise read-only task
     graph developers run locally. Do not preserve `npm`, `pnpm`, `yarn`, or
     `bun` root-task calls as CI compatibility; checked-in workflows are
     editable callers.
   - Extend an existing CI provider and repository action policy. When neither
     exists, report CI as blocked instead of inventing an unverified workflow.

   Completion criterion: for adopted, improved, or retained hk, installation is
   verified from Git's configured hooks path and a safe staged-file probe
   exercises the intended route. If the environment prevents those probes, a
   Git repository keeps the complete checked-in hk graph and records the
   installation and execution evidence as blocked, not hk as skipped or
   inapplicable. For applicable React scopes, the pre-commit, pre-push, and PR
   CI routes satisfy the selected lifecycle and its failure probes. For an
   established CI seam, CI invokes the repository's mise read-only tasks
   directly; otherwise the matrix records CI as unavailable or blocked.

7. Verify the integrated toolchain.
   - Run setup-path inspection, parsed config and task discovery, hook
     installation, the failing Conventional Commit probe, targeted read-only
     checks, the public read-only aggregate, migration equivalence, fix
     idempotence, and applicable repository tests.
   - Run the mechanical developer-setup audit against the final graph. Resolve
     every command reachable from the developer `setup` task, identify the
     package manager from manifests and lockfiles, and require its ordinary
     install command in the resolved path. Fail the integrated validation if
     resolution ends at an unread helper or dynamic command, or if the path
     contains `npm ci`, a frozen, immutable, lockfile-only, or equivalent
     CI-only install. Permit such reproducible-install semantics only on a
     separate route with a cited, established CI caller; do not invent CI to
     justify them.
   - Run the mechanical project-isolated runtime audit. With user/global mise
     configuration disabled, validate task discovery and resolve the complete
     setup graph, executable providers, and versions from checked-in project
     config only. When isolated execution is unavailable, require an equivalent
     complete config-source inventory. Fail if any executable, including the
     package manager or its runtime, resolves only globally, has an untracked
     include source, lacks a project pin, or remains ambiguous.
   - Rerun the mechanical duplicate-edge audit against the final files. Compare
     the complete root-script and resolved-mise-command inventories, and fail
     validation if any mise task still delegates to an ordinary root task
     script. Audit lifecycle, public-interface, and external/uneditable
     compatibility entries in the opposite direction as thin root-to-mise
     wrappers. For a private root, also fail if a conventional command lacks
     the required compatibility classification, or if a retained workspace
     leaf lacks a named orchestrator route.
   - Run the mechanical caller-rewrite audit against final checked-in files.
     For every task owned by mise, fail if CI, hooks, task configuration, or
     another editable executable caller still uses `npm`, `pnpm`, `yarn`, or
     `bun` to invoke its former root script. Resolve each workflow and local
     read-only entry point to prove that they call the same mise task graph.
   - Verify the Oxc state gate. Before equivalence, require every legacy owner
     to be reachable from the documented blocking aggregate/hook path and any
     Oxc parity route to have passing parse and narrow smoke evidence. After
     transfer, require supported scopes to be absent from legacy primary
     execution and every retained named unsupported scope to remain reachable
     from a documented blocking path.
   - Use controlled failing fixtures only when they cannot touch production,
     secrets, or unrelated work. Remove temporary fixtures and confirm the
     final dirty state.
   - Do not run repository-wide formatting merely to prove configuration.

   Completion criterion: success and failure paths are evidenced, temporary
   artifacts are gone, and remaining diffs are limited to the approved scope.

8. Report the evidence.
   - List the branch, matrix decisions, files changed, commands added or
     preserved, version authorities, and hook/CI wiring.
   - Include the final developer-setup audit: package-manager evidence, the
     complete resolved `setup` command sequence and delegation chain, the
     ordinary install selected and found, results of the prohibited
     install-semantics scan, every separate reproducible-install route, and the
     searched CI caller that establishes each route. Mark the audit failed if
     any setup edge is unresolved or any developer install is noncompliant.
   - Include the project-isolated runtime audit: every resolved setup
     executable, its providing tool/runtime, exact project pin and config path,
     intentional project include chain, isolated task-discovery/setup-resolution
     evidence, and verdict. Mark any global-only resolution or missing runtime
     pin as `FAIL`.
   - Include the final duplicate-edge ledger: every root script and command
     body, its mise callers, its lifecycle, public-interface, or
     external/uneditable compatibility evidence, its selected owner and
     disposition, plus a separate inventory of every resolved mise task
     command.
   - Include the final caller-rewrite ledger: each former root task, every
     checked-in caller and its rewritten mise command, any retained lifecycle
     or compatibility wrapper, and the final zero-match package-manager
     invocation scan. For each conventional root command, report the publication
     metadata, contributor/release documentation, hosting/IDE, and downstream
     contract classification and prove that any retained wrapper has no second
     implementation.
   - For every lint and format route, report its exact scope and the labels
     `authoritative` or `parity-only`, `blocking` or `non-blocking`, and
     `read-only` or `mutating`, together with parse, smoke, equivalence, and
     enforcement-path evidence appropriate to its state.
   - Separate passing validation, pre-existing failures, new blockers, and
     intentionally skipped tools.
   - Leave commits and pushes to explicit user authorization.

   Completion criterion: another contributor can reproduce every claim from
   the report without guessing which command mutates files.

## Safety

Keep unrelated changes intact. Prefer narrow samples and changed-file checks.
Do not replace the repository's package manager, run broad format/fix commands,
or commit or push as part of bootstrapping. Treat global shims as availability,
not repository configuration. Keep the skill portable: express every pattern as
generic guidance.
