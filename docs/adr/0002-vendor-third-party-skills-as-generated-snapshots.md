# Vendor third-party skills as generated, pinned snapshots

Third-Party Essentials contains committed generated snapshots of selected
upstream skills. A versioned manifest declares each upstream repository, path,
tracked branch, author, homepage, and license file. A generated lock pins the
resolved commit and deterministic snapshot hash.

## Context

The existing user path must remain one Skills CLI command:
`npx skills@latest add gabimoncha/skills --global`. The CLI's native collection
groups contain repository-relative skill paths; it does not currently let one
group transparently install skills from several independent upstream
repositories while preserving that single installer and group selection.

## Considered options

- A custom global installer wrapper was rejected because the Skills CLI should
  continue to own installation, selection, and conflict handling.
- Pointing users at separate upstream install commands was rejected because it
  removes Third-Party Essentials from this repository's native group flow.
- Copying only each upstream `SKILL.md` was rejected because supporting files
  are part of a skill and can be required by its instructions.
- Customizing generated skills for particular agents was rejected because the
  Collection represents upstream content rather than a maintained fork.

## Decision

Commit the complete upstream skill directory at a pinned commit, then add
repository-owned `UPSTREAM.md` provenance and `LICENSE.upstream` attribution.
Generated snapshot directories are replaced only by dependency-free maintainer
tooling and must not be hand-edited.

`third-party:sync` reproduces the lock without advancing it.
`third-party:update` resolves selected or all declared branch heads, previews
the changes once, confirms once (or accepts `--yes` for automation), and then
updates snapshots, lock, and catalog. `third-party:check` performs an offline,
non-writing integrity check.

All requested snapshots are staged and validated before replacement. Invalid
skills, frontmatter-name mismatches, unsafe paths, incomplete license metadata,
duplicate names, and hash or catalog drift fail without partial output.

## Consequences

- Users keep one native Skills CLI installer and see Essentials and Third-Party
  Essentials as separate groups.
- Upstream content and license text are present in this repository, increasing
  repository size but making installs deterministic and self-contained.
- Maintainers can audit exact commits and hashes and update skills selectively.
- Skills CLI remains responsible for install-time name conflicts; this
  repository adds no global wrapper or conflict policy.
