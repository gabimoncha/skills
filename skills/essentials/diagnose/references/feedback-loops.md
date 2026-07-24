# Feedback Loops

Load this reference when the main workflow lacks a red-capable signal or when the symptom is flaky, performance-related, or human-driven.

## Choose a signal

Try the narrowest option that reaches the real failure boundary:

1. A failing unit, integration, or end-to-end test at the correct seam.
2. A repository script, CLI invocation, or HTTP request with an exact assertion.
3. An existing browser or device flow with DOM, accessibility, console, network, or screen-state evidence.
4. A captured request, payload, trace, or event log replayed through the path in isolation.
5. A minimal harness with real boundary behavior and controlled dependencies.
6. A property/fuzz loop, bisection harness, or old-versus-new differential run when the defect depends on inputs or history.
7. A structured human-in-the-loop protocol using [hitl-loop.template.sh](../scripts/hitl-loop.template.sh) as the starting point.

The signal must assert the reported symptom, not a proxy such as “the process exited successfully.” Preserve the original full scenario even when a smaller harness becomes the primary loop.

## Tighten the loop

After the first red run, sharpen the assertion, narrow setup, cache unrelated initialization, pin variable inputs, and record the command, build, input, output, and artifact path.

For an intermittent issue, declare the run count, failure threshold, environment, and acceptance rule. Raise the reproduction rate with controlled repetition or stress; compare before/after denominators rather than treating one green run as proof.

For a performance issue, establish a baseline distribution and fixed warm-up/sample protocol first. Prefer profiler, trace, timing harness, query plan, or render measurements over logs. Define the metric and threshold before fixing, and check for a material secondary regression.

If no credible loop can be built with available code, tools, and artifacts, stop as **Incomplete**. Report what was tried, the missing environment or artifact, and the smallest user action that would make the signal runnable.
