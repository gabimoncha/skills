# Visual And Device Evidence

Use this reference when the task affects a web page, mobile app, desktop app,
TV app, simulator, emulator, or physical device.

## Select by capability

Use the narrowest capable adapter that is already available:

| Target | Preferred route |
| --- | --- |
| Web with repository browser tests | Existing Playwright, Cypress, Storybook, or equivalent tests |
| Live web page or local dev server | Host browser automation or `agent-browser` |
| iOS Simulator or Android Emulator | Argent when available and capable |
| Physical iOS or Android device | `agent-device` when available and capable |
| React Native desktop, TV, recording, or one cross-platform CLI flow | `agent-device` when available and capable |

Check current tool help and repository scripts before command design. Prefer a
host-provided equivalent when it has stronger access to the existing signed-in
session. Do not install a missing tool without user authority. If no adapter can
prove a required claim, mark that evidence `BLOCKED`.

For `agent-browser`, follow the stable interaction cycle:

```text
open -> wait -> snapshot -> interact -> re-snapshot -> capture
```

Element references expire after navigation or dynamic page changes. Get a new
snapshot before the next interaction. Use snapshot and screenshot diffs only
against a stable, identified baseline.

For Argent or `agent-device`, confirm the selected device, app identity,
checkout or bundle source, backend, user, and runtime before interaction. A
booted simulator or successful tool connection does not prove that it runs the
intended code.

## Capture a usable baseline

Record:

- source commit, branch, build, or deployment;
- route or screen and the user journey state;
- viewport, device, orientation, theme, locale, and accessibility settings;
- test account and fixture assumptions without exposing secrets;
- screenshot or video locator;
- DOM, accessibility, console, network, log, or data evidence required by the
  claim.

Keep current-product captures separate from design targets. If a design file,
reference image, or approved deployment is supplied, identify it as the target.
Do not treat the current UI as the intended design by default.

## Use evidence by lane

### Plan

Capture the current affected routes and important states before design work.
Use the images to define the change boundary, responsive cases, state coverage,
and visual acceptance criteria. Include blank, loading, error, permission, and
populated states when they are in scope.

### Implement

Wait until the changed frontend surface is coherent. Then inspect the exact
changed states against the target. Check layout, typography, spacing, content,
responsive behavior, interaction, and accessibility. Correct material mismatch
before broad review. Keep focused DOM or component tests as regression evidence.

### Review

Stay read-only. Compare the integrated result with the target and with a valid
before state. Use a separate worktree, reference deployment, or supplied
baseline to render the fixed point; do not disturb the current worktree to make
the comparison. Inspect expected change and unexpected drift on nearby routes,
viewports, themes, and states.

### Fix

Reproduce the exact visual or interaction finding. Apply the fix through the
fix lane. Re-capture the affected state and its nearest regression states with
the same environment as the failed evidence.

### QA

Run complete user journeys on the applicable browser, simulator, emulator, or
physical device. For each matrix row, capture the observed result and the state
transition. Use a real physical device when the acceptance claim depends on
hardware, operating-system integration, permissions, camera, calendar,
notifications, biometrics, or device-only behavior.

## Protect shared runtime state

Browser profiles, simulators, devices, app installs, backends, test accounts,
and foreground state can be shared across tasks. Inventory current ownership
before mutation. Use a repository coordination or lease workflow when one
exists. Serialize device input and runtime changes. Restore only state owned by
the current task, and report the final runtime owner and state.

Require separate user authority immediately before money movement, production
mutation, destructive data changes, account deletion, support contact, or
other consequential live actions.

## Judge evidence correctly

A screenshot proves visible pixels at one state. It does not by itself prove
behavior, accessibility, data correctness, network success, or absence of
regression. Combine it with semantic and runtime evidence that directly
supports the acceptance claim.
