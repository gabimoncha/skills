---
name: github-writing
description: Load this skill before you post text to GitHub for the user, such as a PR, an issue, a comment, a review, or a discussion. Covers the writing rules, repository templates and issue forms, the issue sections when no template exists, the closing note, and the private details to remove.
metadata:
  internal: true
---

# Writing on GitHub for the user

## Every post

- If the `clarity` skill is installed, read its reply rules, its technical-writing reference, and `unslop`. Apply them to the full text.
- Name a cause or a fix only if you proved it. Do not ask the reader for anything. Explain every term that the reader may not know.
- Remove local paths, simulator IDs, emails, and tokens.

## Templates

- If the repository has a template or a form for the post, use its exact sections, in its order.
- A PR in a repository without a PR template uses the `pr` skill, if it is installed.
- An issue in a repository without an issue template uses these sections, in this order: Version, Problem, Steps to reproduce, Expected, Actual, Workaround.

## Issues

- Start with the problem and its effect. Then give the steps to reproduce, the expected and actual results, the versions, and a short log excerpt.
- End the issue with this note. Replace `<harness>` and `<model>` with your harness and model, for example `Claude Code` and `claude-opus-5-5`. Replace `<login>` with the GitHub login of the user's account. Get it with `gh api user --jq .login`. If you cannot get it, ask the user for it:

```markdown
> [!NOTE]
> This issue was reported by <harness> <model> with @<login>'s permission.
```

- Do not add the note if the repository already tells the agent how to identify itself, for example with a "Filed by" section or an AI disclosure field. Look in the template or form, `CONTRIBUTING.md`, and any triage guide that the repository gives to agents. Follow that instruction only, so the issue names the agent one time.
