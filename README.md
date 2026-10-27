# Skills

My collection of reusable agent skills.

## Install

Install into the current project and select individual skills or collections
interactively:

```sh
npx skills@latest add gabimoncha/skills
```

Add `--global` to make the selected skills available across projects:

```sh
npx skills@latest add gabimoncha/skills --global
```

## Collections

| Collection | Purpose |
| --- | --- |
| [Essentials](skills/essentials) | Cross-project skills recommended for global installation. |
| [Frontend Essentials](skills/frontend-essentials) | Skills for frontend and mobile application work. |

`.claude-plugin/marketplace.json` presents each collection as a separate
installer group.

## Add a skill

1. Create `skills/<collection>/<skill-name>/SKILL.md` with `name` and
   `description` frontmatter and `metadata.internal: true`. The Skills CLI
   hides internal skills from discovery.
2. To test the skill, install it by name:
   `npx skills@latest add gabimoncha/skills --skill <skill-name>`.
3. When the skill is ready, promote it. Remove the `internal` marker and add
   its directory to the matching group in `.claude-plugin/marketplace.json`.

## Develop

`mise.toml` pins the Node.js version for the `.mjs` tools. Run the tests with
Bun:

```sh
bun run test
```

## License

[MIT](LICENSE)
