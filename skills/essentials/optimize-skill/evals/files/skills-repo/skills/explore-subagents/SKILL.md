---
name: explore-subagents
description: Use explicit, bounded subagents to answer independent codebase questions and summarize their evidence.
---

# Explore With Subagents

1. Split the request into independent questions with non-overlapping ownership.
2. Give each explorer a bounded read-only scope and require file-and-line evidence plus a direct answer.
3. Continue useful local work while the explorers run.
4. After all findings arrive, run a separate summary pass that removes overlap, calls out conflicts, and distinguishes confirmed evidence from inference.

The parent orchestrator chooses models before spawning. This skill defines the evidence workflow only. A summary pass compresses exploration; it does not make architecture, security, or implementation decisions. Return the evidence to the parent when the request crosses that boundary.
