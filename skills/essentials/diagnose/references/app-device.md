# App And Device Adapters

Load this reference for live evidence on mobile, desktop, TV, physical devices, or React Native targets.

Use an equivalent host-provided adapter when one is already available. Detect a required adapter before suggesting installation:

```bash
command -v agent-device
```

If a missing adapter blocks the evidence loop, report the exact install command and wait for installation or approval; otherwise continue with tests, logs, browser tooling, command-line repros, or user-provided artifacts.

## Defaults

| Target | Preferred adapter |
| --- | --- |
| iOS Simulator | host-provided device adapter |
| Android Emulator | host-provided device adapter |
| physical iOS or Android device | agent-device |
| React Native macOS, TV, or desktop | agent-device |
| React Native Web or React DOM | browser tooling; see [browser-react.md](browser-react.md) |

## agent-device

Prefer agent-device for physical devices, macOS/TV/desktop apps, replayable flows, CI evidence, screenshots/video, network/log/performance capture, and broad CLI automation. Read the installed workflow help before planning commands:

```bash
agent-device --version
agent-device help workflow
```

Use narrower help when relevant: `debugging`, `react-native`, `react-devtools`, or `macos`. If it is missing, suggest:

```bash
npm install -g agent-device@latest
agent-device help workflow
```
