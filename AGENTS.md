# Agents

This is a single-context repo. `GLOSSARY.md` holds the domain language. Use its terms in code, docs, and replies.

## Skill lifecycle

A new authored skill moves through two stages, in this order:

1. **Internal Skill.** Create the skill at `skills/<collection>/<skill-name>/SKILL.md`. Give it `name` and `description` frontmatter, and add this marker to the frontmatter:

   ```yaml
   metadata:
     internal: true
   ```

   The marker hides the skill from Skills CLI discovery. To test the skill while it is internal, install it by name:

   ```sh
   npx skills@latest add gabimoncha/skills --skill <skill-name>
   ```

2. **Promotion.** When the owner considers the skill ready, make both changes in the same commit:
   - Remove the `internal` marker from the frontmatter.
   - Add `./skills/<collection>/<skill-name>` to the group of its Collection in `.claude-plugin/marketplace.json`.

The Marketplace Manifest lists only Public Skills. An Internal Skill never appears in it.

## Repository Skills

`.agents/skills/` holds the Repository Skills that maintain this repo, and `.claude/skills/` links to them. They belong to no Collection, so they stay out of the Marketplace Manifest.
