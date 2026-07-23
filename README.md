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
| [Everyday](skills/everyday) | Portable skills I use across most projects. |
| [Personal](skills/personal) | Skills tailored to my own workflows and environment. |

Each skill belongs to exactly one collection. Choose Everyday when a mature
skill is both personal and broadly reusable across projects.

## Add a skill

1. Create `skills/<collection>/<skill-name>/SKILL.md`.
2. Add at least `name` and `description` frontmatter. To keep work in progress
   internal, also set `metadata.internal: true`.
3. Synchronize the marketplace catalog:

   ```sh
   bun run catalog:sync
   ```

Use `bun run catalog:check` to verify that the generated catalog matches the skill directories without changing files.

Each skill follows the Agent Skills format: a directory containing a `SKILL.md`
with `name` and `description` frontmatter. Supporting files and directories
without a `SKILL.md` are not published.

Either collection may contain internal skills. Internal status keeps a skill in
its intended collection while excluding it from normal CLI discovery. Add:

```yaml
metadata:
  internal: true
```

Remove the flag and synchronize the catalog when the skill is ready to promote.

## License

[MIT](LICENSE)
