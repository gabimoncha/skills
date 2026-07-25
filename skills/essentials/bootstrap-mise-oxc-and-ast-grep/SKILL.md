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

Read [references/tool-patterns.md](references/tool-patterns.md) before designing
or changing the toolchain. Verify current syntax in official documentation
before introducing a command or option that the repository does not already
exercise.

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
   - Select **bootstrap** only when no meaningful setup exists; otherwise select
     **reconcile** and treat existing behavior as evidence.

   Completion criterion: the branch choice, authorities, dirty files, public
   commands, mutation boundaries, and baseline failures are explicit.

2. Create this six-row decision matrix before editing:

   | Tool | Applicability | Ownership boundary | Version source(s) | Baseline | Decision | Integration seam | Validation |
   | --- | --- | --- | --- | --- | --- | --- | --- |
   | mise |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | hk/Pkl |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | ast-grep |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | React Doctor |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | Oxlint |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |
   | Oxfmt |  |  |  |  | adopt / improve / retain / skip / blocked |  |  |

   Completion criterion: every cell is resolved from repository evidence, and
   every skip or block has a concrete reason.

3. Design the repo-native command graph.
   - Define one setup path, read-only checks, explicit fixes, staged-or-changed
     hook paths, and CI paths.
   - Let mise compose commands where compatible while preserving established
     package scripts, public command names, workspace filters, and nested
     routing.
   - Keep setup, check, and fix semantics distinct; a command named `check`
     must not rewrite tracked files.

   Completion criterion: each public entry point maps to one implementation and
   its mutation behavior is unambiguous.

4. Implement incrementally in matrix order.
   - Reconcile runtime and tool versions before adding mise tasks.
   - Establish hk/Pkl and actual hook installation before routing staged checks.
   - Add ast-grep only for a real structural use case with tested rules; use
     `$ast-grep` for rule authoring and debugging when that skill is available.
   - Add React Doctor only to React scopes.
   - Migrate or extend Oxlint without dropping unsupported lint semantics, then
     configure Oxfmt without broad formatting.
   - Validate each tool at its ownership boundary before proceeding.

   Completion criterion: every adopted or improved row has a focused passing
   validation. If a missing dependency, unsupported command, or unresolved
   version blocks that proof, restore the row's speculative edits and mark it
   `blocked`; environment-only blockers may retain edits only when configuration
   parsing proves the complete command graph exists in the repository.

5. Reconcile overlap and ordering.
   - Assign one owner to each file class and diagnostic.
   - Order structural fixes, formatting, lint fixes, and read-only checks so
     later stages stabilize rather than undo earlier output.
   - Preserve generated-file exclusions, nested configs, and rules that the new
     tools cannot represent.

   Completion criterion: no file class has competing writers, and running the
   fix graph twice produces no second diff on the controlled sample. Every
   retained tool dependency or config has an exercised command or a documented
   complementary responsibility.

6. Wire hooks and CI.
   - Keep hooks staged or changed-file aware when supported; reserve broader
     checks for CI or explicit full-check commands.
   - Install hk through the repository's setup path and verify the expected Git
     hook files exist and invoke hk.
   - Make CI use the same read-only command graph developers can run locally.
   - Extend an existing CI provider and repository action policy. When neither
     exists, report CI as blocked instead of inventing an unverified workflow.

   Completion criterion: for adopted, improved, or retained hk, installation is
   verified from Git's configured hooks path and a safe staged-file probe
   exercises the intended route; otherwise the hk row records its skip or
   blocker. For an established CI seam, CI invokes only read-only checks;
   otherwise the matrix records CI as unavailable or blocked.

7. Verify the integrated toolchain.
   - Run config validation, targeted checks, the public read-only aggregate,
     and applicable repository tests.
   - Use controlled failing fixtures only when they cannot touch production,
     secrets, or unrelated work. Remove temporary fixtures and confirm the
     final dirty state.
   - Do not run repository-wide formatting merely to prove configuration.

   Completion criterion: success and failure paths are evidenced, temporary
   artifacts are gone, and remaining diffs are limited to the approved scope.

8. Report the evidence.
   - List the branch, matrix decisions, files changed, commands added or
     preserved, version authorities, and hook/CI wiring.
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
