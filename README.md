# Skills

My collection of reusable agent skills.

## Install

Install into the current project and select individual skills or collections
interactively:

```sh
npx skills@latest add gabimoncha/skills
```

Use the same interactive flow with `--global` to make the selected skills
available across projects:

```sh
npx skills@latest add gabimoncha/skills --global
```

## Collections

| Collection | Purpose |
| --- | --- |
| [Essentials](skills/essentials) | Cross-project skills recommended for global installation. |
| [Third-Party Essentials](skills/third-party-essentials) | Curated, pinned snapshots of useful upstream skills, also recommended for global installation. |

The Skills CLI presents these as separate native groups in the same interactive
installer. Essentials contains skills authored in this repository; Third-Party
Essentials contains generated snapshots maintained upstream.

## Add an authored skill

1. Create `skills/essentials/<skill-name>/SKILL.md`.
2. Add at least `name` and `description` frontmatter. To keep work in progress
   internal, also set `metadata.internal: true`.
3. Synchronize the marketplace catalog:

   ```sh
   bun run catalog:sync
   ```

Use `bun run catalog:check` to verify that the generated catalog matches the
skill directories without changing files.

Each skill follows the Agent Skills format: a directory containing a `SKILL.md`
with `name` and `description` frontmatter. Supporting files and directories
without a `SKILL.md` are not published.

The collection may contain internal skills. Internal status keeps a skill in its
intended collection while excluding it from normal CLI discovery. Add:

```yaml
metadata:
  internal: true
```

Remove the flag and synchronize the catalog when the skill is ready to promote.

## Maintain third-party skills

Third-party sources are declared in
[`skills/third-party-essentials/sources.json`](skills/third-party-essentials/sources.json).
Each entry records the upstream repository, skill path, tracked branch, author,
homepage, SPDX license identifier, and license file. Maintainers remain
responsible for confirming that each upstream license is compatible with
redistribution in this repository. To add one:

1. Add its complete metadata to `sources.json`.
2. Run `bun run third-party:update <skill-name>`. Review the single preview and
   confirm it. Use `--yes` only for non-interactive automation.
3. Review the generated snapshot, resolved commit and hash in
   `sources.lock.json`, provenance, upstream license, and catalog change.
4. Run the verification commands below.

To advance selected skills to their declared branch heads:

```sh
bun run third-party:update find-docs
```

Omit skill names to update every entry. The updater stages all requested
snapshots before replacing anything, so a missing skill, invalid frontmatter,
unsafe path, missing license, or other validation failure leaves the current
lock, snapshots, and catalog intact.

Use `bun run third-party:sync` to reproduce every generated snapshot from the
already resolved commits without advancing branches. Use
`bun run third-party:check` for an offline, non-writing verification of the
manifest, lock, snapshots, attribution, hashes, duplicate names, and catalog.

The generated directories
`skills/third-party-essentials/<skill-name>/` are complete upstream skill
snapshots plus `UPSTREAM.md` and `LICENSE.upstream`. Do not edit them by hand;
change the manifest or upstream source and run the maintainer commands.

## Catalog implementation

The authored and generated collection trees are the source of truth for normal
CLI discovery. The dependency-free synchronizer inspects immediate child
directories under both collections, recognizes only directories containing
`SKILL.md`, and excludes skills whose frontmatter sets
`metadata.internal: true`. It also rejects duplicate skill names across
collections.

`bun run catalog:sync` sorts the discovered public skill paths and rewrites the
complete `.claude-plugin/marketplace.json` deterministically. The non-writing
`bun run catalog:check` computes the same expected catalog, exits unsuccessfully
on drift, and tells the maintainer how to synchronize it.

The rationale for deriving the catalog from collection membership is recorded
in [ADR-0001](docs/adr/0001-derive-marketplace-from-collections.md). The current
Skills CLI constraint and generated-snapshot choice are recorded in
[ADR-0002](docs/adr/0002-vendor-third-party-skills-as-generated-snapshots.md).

`bun run test` exercises that workflow in an isolated temporary repository. It
checks both collection groups, internal-skill exclusion, sorting, idempotence,
locked reproduction, selected updates, supporting files, attribution,
confirmation, validation failure atomicity, and non-writing drift detection.
Validate the repository manifest directly with:

```sh
claude plugin validate --strict .
```

The focused non-writing checks are:

```sh
bun run third-party:check
bun run catalog:check
bun run test
```

## License

[MIT](LICENSE)
