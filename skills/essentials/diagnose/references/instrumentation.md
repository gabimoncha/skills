# Instrumentation

Load this reference when a diagnosis needs runtime probes, logs, metrics, or temporary debug hooks.

## Probe quality

Choose the least-perturbing probe that distinguishes the candidates:

1. debugger or REPL inspection
2. assertion or targeted counter
3. metric, profiler, or trace
4. structured log at a causal boundary

Use logs when they can answer a question the other probes cannot. Instrument boundaries, not just the symptom:

- state writes and derived-state updates
- render, effect, subscription, and lifecycle transitions
- event handlers and async callbacks
- allocator, cache, ownership, persistence, and network handoffs
- layout measurements and final applied values
- native/JS bridges
- scheduler, timer, animation-frame, debounce, and throttle handoffs

When layers may disagree, log comparable fields on both sides with one run/debug ID. Change one causal variable at a time; multiple passive observations may run together when they share a probe contract.

## Structured logs

Every temporary log includes an absolute timestamp, stable debug/run ID, event name, compact structured payload, and a sequence number when order matters.

```ts
const DEBUG_ID = "checkout-total-v2";
let sequence = 0;

console.log(`${Date.now()} [DEBUG ${DEBUG_ID}] price-recalculated`, {
  sequence: ++sequence,
  cartId,
  previousTotal,
  nextTotal,
});
```

If logging changes timing or hides the bug, switch to buffered in-memory events, a debug registry, sampled output, delayed flush, a profiler, or targeted counters before drawing conclusions.

## Lifecycle and staging

Keep probes through the active evidence loop so later passes can be compared. In a diagnosis-only handoff, leave them unstaged and report them as intentional diagnostics. In a completed fix branch, remove only temporary probes created by that run unless the user requests retention or the probes have become durable diagnostics.

If the user asks to commit during diagnosis, stage only intended durable paths, verify the staged diff excludes temporary probes, commit the durable changes, and report diagnostic files that remain unstaged.
