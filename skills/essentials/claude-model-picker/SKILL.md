---
name: model-picker
description: Use before spawning Codex subagents or delegated Codex workflows to select the supported OpenAI model and reasoning effort for the work.
---

# Model Picker

This policy governs model and reasoning selection for delegated Codex work. It
does not change the model for a singular session that performs the work itself.

## Picking the right models for workflows and subagents

- Honor a model or effort explicitly requested by the user. Otherwise use the
  lanes below.
- Select only models exposed by the active orchestration surface. When a lane's
  preferred model is unavailable, use `gpt-5.6-sol` at the lane's effort. If
  that model is also unavailable, use the strongest exposed coding model at
  the same effort instead of bypassing the surface to force a model.
- If a delegated agent may delegate again, tell it to use `$model-picker`
  before it selects or spawns its own agents.
- Do not select Terra unless the user explicitly overrides this repository
  policy in the current request.
- Do not encode `pro` as a reasoning effort. Use it only through a separate
  supported model or mode control exposed by the active product surface.

## Model and Effort Lanes

| Lane | Work | Model | Effort |
| --- | --- | --- | --- |
| Mechanical | Preprocessing or shell-heavy inventory | `gpt-5.6-luna` | low |
| Exploration | Bounded, parallel, read-only evidence gathering | `gpt-5.6-luna` | medium |
| Exploration summary | Compress completed evidence when Spark is supported | `gpt-5.3-codex-spark` | high |
| Exploration summary fallback | Compress completed evidence when Spark is unavailable | `gpt-5.6-sol` | high |
| Clear implementation | Clear-spec implementation, fixes, or review slices | `gpt-5.6-luna` | high |
| Judgment | Synthesis requiring judgment or independent review | `gpt-5.6-sol` | low |
| Ambiguous implementation | Multi-subsystem implementation with unresolved design choices | `gpt-5.6-sol` | medium |
| Security and architecture | Security analysis or architectural decisions | `gpt-5.6-sol` | high |
| Hardest | Only genuinely hardest cases | `gpt-5.6-sol` | max |

For exploration, gather evidence before starting a separate summary pass.
Spark summarizes completed evidence; it does not make architecture, security,
or implementation decisions. When the result requires those decisions, use the
matching judgment lane.
