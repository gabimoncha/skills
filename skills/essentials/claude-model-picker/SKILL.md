---
name: claude-model-picker
description: Use before spawning subagents, workflow dispatch or ultrawork, in order to choose the model and reasoning effort.
---

## Picking the right models for workflows and subagents

Rankings on a 1–10 scale, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model               | cost | intelligence | taste |
|---                  |---   |---           |---    |
| gpt-5.6-sol         | 7    | 8            | 6     |
| gpt-5.6-luna        | 9    | 6            | 5     |
| gpt-5.3-codex-spark | 6    | 4            | 3     |
| sonnet-5            | 3    | 5            | 7     |
| opus-4.8            | 2    | 7            | 7     |
| fable-5             | 1    | 9            | 9     |


## How to apply

- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Mechanical preprocessing: gpt-5.6-luna low.
- Bounded read-only exploration: gpt-5.6-luna medium.
- Completed exploration summaries: gpt-5.3-codex-spark high when supported;
  otherwise gpt-5.6-luna high.
- Clear-spec implementation: gpt-5.6-luna high.
- Judgment or an independent review: gpt-5.6-sol low.
- Ambiguous multi-subsystem implementation: gpt-5.6-sol medium.
- Security and architecture: gpt-5.6-sol high.
- Only genuinely hardest cases: gpt-5.6-sol max when the dispatch surface
  supports it.
- Never use Haiku.
- Never use Terra.
- Anything user-facing (UI, copy, API design) needs taste ≥ 7: fable-5, opus-4.8, or sonnet-5.
- Reviews of plans or implementations can use fable-5 for a native Claude perspective or gpt-5.6-sol low for an independent Codex perspective.
- Device QA with Argent or agent-device: gpt-5.6-luna low, via `/codex:rescue --model gpt-5.6-luna --effort low`.

## Mechanics

Claude models (sonnet-5, opus-4.8, fable-5) run via the `model` parameter on Agent and Workflow calls.

From the main session, prefer the `openai/codex-plugin-cc` plugin's slash commands — they own session tracking, background jobs, and structured review output:

- `/codex:rescue` — delegate active debugging, multi-file refactoring, or implementation loops. The only command with model selection: `--model <gpt-model>` (shorthand: `spark` → gpt-5.3-codex-spark) and `--effort <none|minimal|low|medium|high|xhigh>`.
- `/codex:review` — non-destructive, read-only code quality review. Supports `--base <ref>` for branch analysis and `--wait|--background` for execution mode. No model/effort flags — it uses Codex's default model.
- `/codex:adversarial-review` — skeptical design review pressure-testing tradeoffs, auth, and reliability. Append focus text at the end to steer it. Same flags as `/codex:review`.
- `/codex:status` / `/codex:result` / `/codex:cancel` — check, fetch, or abort jobs launched with `--background`.

When delegating through the Agent tool or a workflow, skip the plugin and run the Codex CLI directly through a thin Claude wrapper — `model` on Agent/agent() only accepts Claude models, so the wrapper is a cheap sonnet that shells out:

```
Agent(subagent_type: "general-purpose", model: "sonnet", run_in_background: true, prompt: `
  You are a thin execution wrapper. Run exactly this command via Bash, then return the
  final Codex message, tokens used, and exit code. Do no other work; no retries with
  different flags — return errors verbatim.

  codex exec -m gpt-5.6-sol -c model_reasoning_effort="high" "<self-contained task>" </dev/null
`)
```

In workflows, use the same wrapper prompt via `agent(prompt, {label: 'gpt-5.6-sol:<task>', model: 'sonnet', effort: 'low', schema: {...}})` — put the GPT model in the label so the TUI shows what's actually thinking; the model column will show the sonnet wrapper.

- Effort values: `minimal|low|medium|high|xhigh`. Add `-s read-only` for review/diagnosis-only tasks; the default sandbox is write-capable.
- The Codex prompt must be self-contained — Codex sees none of the conversation context.
- ALWAYS keep the `</dev/null`: with a kept-open non-TTY stdin (e.g. a backgrounded Bash call), `codex exec` blocks forever on "Reading additional input from stdin...".
- Long runs: prefer one foreground Bash call with a raised timeout (max 10 min); `run_in_background` + polling is safe only with the stdin redirect in place.
- NEVER spawn `codex:codex-rescue` as a *named* teammate (`name:` param) — it is a one-shot forwarder, and a named spawn idles forever without starting work. Unnamed background spawns of it still work if the plugin path is preferred.
- Do NOT pass a GPT model string to `model:` on Agent/agent() — without an LLM gateway it dies immediately ("model may not exist"). The wrapper is the only direct-dispatch path, and it keeps Codex-plan pricing (a gateway would bill OpenAI API per-token rates, invalidating the cost table).

For closed-loop quality assurance, keep the review gate on via `/codex:setup --enable-review-gate`: a stop hook automatically challenges Claude's outputs with Codex before finalizing, so broken code or weak design assumptions never reach the main session unvetted.