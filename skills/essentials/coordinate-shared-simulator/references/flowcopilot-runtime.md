# FlowCopilot shared runtime

FlowCopilot worktrees isolate source files. They do not isolate the iOS Simulator, installed app, device state, or host tooling. Treat runtime identity as `(owner cwd, Metro port, simulator UDID)`.

## Contents

- [State boundaries](#state-boundaries)
- [Per-checkout preflight](#per-checkout-preflight)
- [Runtime selection and binding](#runtime-selection-and-binding)
- [Native install compatibility](#native-install-compatibility)
- [Shared-host hazards](#shared-host-hazards)
- [Targeted handback](#targeted-handback)
- [Completion criteria](#completion-criteria)

## State boundaries

**Host-global mutable state**

- booted simulator set, pinned UDID, foreground UI, app data, auth, permissions, clipboard, and notifications;
- installed binary per bundle ID and the development client's current Metro deep link;
- Argent device transport, debugger, network, profiler, and React DevTools sessions;
- Maestro/XCTest activity and any app launch, reload, clear-state, or permission operation;
- TCP port namespace plus the Portless daemon and `~/.portless/routes.json`.

**Worktree-scoped identity**

- branch, files, repo root, slug, `.session-ports`, and logs;
- URLs and environment baked into that worktree's Metro bundle;
- Metro/web/server/audio processes identified by their owning cwd, even though the processes run on the shared host.

A runtime from checkout A serves checkout A's source. A simulator connected to it does not expose unmerged source from checkout B.

## Per-checkout preflight

Run this once for **each** target, replacing the array entries with absolute checkout paths. Keeping `cd` inside the subshell matters because `dev-env.sh` resolves the repo from the process cwd.

```bash
for TARGET_CWD in \
  '/absolute/path/to/flowcopilot' \
  '/absolute/path/to/flowcopilot.other-worktree'; do
  (
    cd "$TARGET_CWD" || exit 1
    printf 'host=%s\n' "$(hostname)"
    printf 'cwd=%s\n' "$(pwd -P)"
    printf 'repo_root=%s\n' "$(git rev-parse --show-toplevel)"
    printf 'git_common_dir=%s\n' "$(git rev-parse --path-format=absolute --git-common-dir)"
    printf 'slug=%s\n' "$(bash scripts/dev/worktree-slug.sh)"
    if ! scripts/dev/dev-env.sh --json; then
      printf 'runtime=none\n'
    fi
  )
done
xcrun simctl list devices booted
```

Require the same host and, for FlowCopilot worktrees, the same absolute Git common directory before using the repository-scoped atomic lease. Distinct checkouts that produce the same slug can claim the same Portless route names; resolve that collision before concurrent runtimes. Compare successful `dev-env.sh --json` results too, especially `urlPrefix`, `metroUrl`, and `metroUnderlyingPort`.

`runtime=none` is valid inventory, not evidence that another checkout's runtime serves this code. Record it and choose one of: reuse the correctly owned runtime, start a target runtime under a runtime-change grant, or release without device testing.

Pin exactly one booted iPhone UDID. If discovery returns multiple candidates, select explicitly with the user or existing ledger instead of accepting a tool's first-device default.

## Runtime selection and binding

For simultaneous worktree runtimes, start the missing target from its own cwd with:

```bash
(cd "$TARGET_CWD" && bun dev:sim)
```

`bun dev:sim` gives Portless-managed services worktree-prefixed hostnames and dynamically routed underlying ports. Direct `bun dev` uses fixed localhost ports and is unsuitable for concurrent runtimes. Starting `dev:sim` can reconcile the host-global Portless daemon, so include it in the runtime-change grant and record routes before and after.

After startup, pin the actual underlying Metro port rather than the friendly URL:

```bash
RUNTIME_JSON="$(cd "$TARGET_CWD" && scripts/dev/dev-env.sh --json)"
METRO_PORT="$(jq -r '.metroUnderlyingPort // empty' <<<"$RUNTIME_JSON")"
printf 'metro_port=%s\n' "$METRO_PORT"
```

An empty port blocks device binding. With `UDID` and `METRO_PORT` fixed, call the debugger status capability (currently `debugger-status`) using `{port: METRO_PORT, device_id: UDID}`. Its returned `logicalDeviceId` must match the pinned device, and `projectRoot` must resolve under the intended checkout (normally `<TARGET_CWD>/apps/native`). A different root means the simulator is attached to another Metro.

Connecting through the Expo development-client deep link, reloading Metro, restarting the app, or changing debugger/profiler ownership all belong to the active lease. Prefer the targeted `open-url`, `restart-app`, `debugger-reload-metro`, and per-device cleanup capabilities.

## Native install compatibility

Development worktrees use the same iOS bundle ID, `cooking.mvp.flow.dev`, and scheme, `flow-dev`. They cannot retain two different development binaries under that identifier on one simulator. Compare native fingerprints from each target:

```bash
(cd "$TARGET_CWD/apps/native" && \
  NODE_ENV=development APP_VARIANT=development \
  bun expo-updates fingerprint:generate --platform ios | jq -r '.hash')
```

Matching fingerprints support sharing one installed native shell while switching JS runtimes. A native dependency, config plugin, entitlement, or project-setting difference requires a compatible rebuild/install; Metro alone cannot supply it. Treat install as an explicit lease action because it replaces the shared bundle and may disturb app data, permissions, auth, or current foreground state.

`./scripts/dev/setup-simulator.sh` installs an app and then deep-links it to the invoking checkout's Metro. Reserve `--force` for an explicit build-download plus device-topology grant: it ignores reuse, downloads again, and can boot another simulator even when one is already running.

## Shared-host hazards

- **Portless:** route storage and proxy lifecycle are global. Unique checkout slugs and compatible proxy mode/port/TLS settings are prerequisites for concurrent `dev:sim` runtimes.
- **Session cleanup:** `(cd "$TARGET_CWD" && ./scripts/dev/cleanup-session.sh)` kills that checkout's tmux session, clears its logs, and removes its `.session-ports`. Use it only after every consumer yields that runtime.
- **Device cleanup:** normally keep the simulator and targeted transport available for the next owner. `stop-simulator-server` affects one device; global `stop-all-simulator-servers` affects iOS, Android, native-devtools, and Chromium sessions, so use global stop only when the ledger confirms all consumers are finished.
- **Maestro:** execution requires an explicit user request and an active lease. Run the repo wrapper from the target checkout, pin `MAESTRO_DEVICE_ID="$UDID"`, and use the correct launch mode. Maestro can launch/clear the app, alter permissions/data, and otherwise invalidate another task's observation.

## Targeted handback

1. Finish the granted atomic action and stop all owner input, reload, debug, profile, install, and Maestro activity.
2. Capture evidence plus the current screen, bundle/variant, app data assumptions, pinned UDID, Metro port, runtime cwd, and `debugger-status` result.
3. If the grant promised restoration, reconnect the development client to the recorded original Metro without reinstalling, then verify its `projectRoot` and device ID.
4. Restore only the foreground screen, login/test user, permissions, or app state named in the grant; otherwise report the changed state for the next owner.
5. Stop a temporary runtime with the target-cwd `cleanup-session.sh` only after its final consumer yields. Keep shared Portless/device services when the next lease needs them.
6. Send `RELEASED` with evidence and final state. The control tower verifies live state, token-releases the lock, and records `RESTORED` before the next grant.

## Completion criteria

Handback is complete when the ledger states one booted UDID; the installed bundle and native fingerprint assumption are known; the simulator's Metro port and `debugger-status.projectRoot` match the recorded owner (or runtime is explicitly `none`); no Maestro/debugger/profiler/install action remains active; every started or stopped runtime is accounted for by cwd; Portless route ownership is unambiguous; and the promised restore target is verified or its exact mismatch is reported.
