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
| [Frontend Essentials](skills/frontend-essentials) | Skills for frontend and mobile application work. |

The static `.claude-plugin/marketplace.json` manifest presents these folders as
separate installer groups. Skill Packs combine selected skills into installation
sets for agents and projects.

## Add an authored skill

1. Create the skill under its collection, such as
   `skills/essentials/<skill-name>/SKILL.md` or
   `skills/frontend-essentials/<skill-name>/SKILL.md`.
2. Add at least `name` and `description` frontmatter.
3. For a public skill, add its directory to the matching group in
   `.claude-plugin/marketplace.json`.

Each skill follows the Agent Skills format: a directory containing a `SKILL.md`
with `name` and `description` frontmatter. Supporting files and directories
without a `SKILL.md` are not published.

The collection may contain internal skills. Keep work in progress out of normal
Skills CLI discovery with:

```yaml
metadata:
  internal: true
```

The Skills CLI excludes these skills during repository discovery. When the
skill is ready, remove the marker, add it to the marketplace group, and add it
to the applicable packs.

Run the repository tests with:

```sh
bun run test
```

## License

[MIT](LICENSE)
