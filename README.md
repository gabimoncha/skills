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

Essentials is the only collection for now. Add new skills there until a concrete
need for another collection emerges.

## Add a skill

1. Create `skills/<collection>/<skill-name>/SKILL.md`.
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

## Catalog implementation

The collection tree is the source of truth. The dependency-free synchronizer
inspects immediate child directories under `skills/essentials/`, recognizes only
directories containing `SKILL.md`, and excludes skills whose frontmatter sets
`metadata.internal: true`.

`bun run catalog:sync` sorts the discovered public skill paths and rewrites the
complete `.claude-plugin/marketplace.json` deterministically. The non-writing
`bun run catalog:check` computes the same expected catalog, exits unsuccessfully
on drift, and tells the maintainer how to synchronize it.

The rationale for deriving the catalog from collection membership is recorded
in [ADR-0001](docs/adr/0001-derive-marketplace-from-collections.md).

`bun run test` exercises that workflow in an isolated temporary repository. It
checks collection placement, internal-skill exclusion, sorting, idempotence,
non-writing drift detection, and compatibility with the official Claude
marketplace validator. Validate the repository manifest directly with:

```sh
claude plugin validate --strict .
```

## License

[MIT](LICENSE)
