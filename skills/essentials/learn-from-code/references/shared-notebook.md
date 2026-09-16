# Optional shared notebook

One chosen notebook owns concept progress across projects. Reuse the path from
the user's request, project guidance, or a project-local `LEARN.md` pointer. If
none is available and sharing is requested, ask where to save it. Do not assume
another machine or project can discover the path automatically.

When the user chooses sharing, keep a short pointer in project-root `LEARN.md`:

```markdown
# Learning notebook

Shared notebook: [Learning index](</absolute/chosen/path/LEARN.md>)
```

Apply the skill's project-local tracking rule to this pointer. Resolve it before
reviewing prior learning;
store concept progress only in the shared notebook. If the shared path is
unavailable, report that and retain proposed updates for later; do not silently
create a competing notebook. If a local notebook already has lessons, merge them
into the shared record before replacing it with a pointer. Preserve unique
history, reconcile IDs, and deduplicate overlapping sessions rather than summing
counters blindly. Verify the merge before replacing the local content.

## Organization

Start with one `LEARN.md` unless the user wants folders or the notebook is already
large. For a split notebook, keep `LEARN.md` as the index and link to concept files:

```text
LEARN.md
principles/<concept>.md
languages/<language>/<concept>.md
runtimes/<runtime>/<concept>.md
libraries/<library>/<concept>.md
```

Create folders only when they contain lessons. Each concept has one canonical
file; topics and links connect it to other categories. Move the template's concept
section into those files when splitting, preserving IDs, history, and index links.
Read the index and relevant concept files rather than loading every lesson.

## Git synchronization

A shared directory works without Git. If the user wants a private repository,
establish its destination and remote visibility before publishing content. Create,
commit, or push only when requested or covered by an existing explicit sync
preference; reuse that authorization without asking each time. Record that
preference with the notebook so later sessions can follow it.

When synchronizing, inspect Git status, include only notebook changes, and
preserve unrelated work. Report push failures or conflicts without force-pushing
or rewriting learning history. Keep the shared learning files tracked; the
project-local ignore rule applies only to the local pointer.
