# Browser and React debugging

Use this reference for React DOM, React Native Web, browser-rendered UI, and localhost frontend bugs.

## Detect the stack

Inspect the repo before choosing a browser tool:

```bash
cat package.json
```

Look for:

- framework: `next`, `vite`, `react-scripts`, `remix`, `astro`, `expo`, `react-native-web`
- React packages: `react`, `react-dom`, `react-native-web`
- browser/test tooling: `cypress`, `vitest`, `@testing-library/react`, `storybook`
- scripts: `dev`, `start`, `test`, `test:e2e`, `cypress`, `storybook`

If package metadata is insufficient, inspect config files such as `vite.config.*`, `next.config.*`, `cypress.config.*`, `vitest.config.*`, and `.storybook/`.

## Browser adapter order

1. **Existing repo test tooling**: prefer existing browser tests, Storybook tests, or Testing Library coverage when it can reproduce the bug. This gives the best regression path.
2. **Host-provided browser automation**: use the browser tools exposed by the current agent environment for live localhost inspection, DOM state, user interactions, screenshots, console errors, and network evidence.
3. **agent-browser**: use as the CLI fallback for browser reproduction and inspection. Capture snapshots, interact through element refs, and check the resulting state.
4. **agent-device web**: use when the browser flow must be replayable alongside mobile/device flows, recorded, captured as CLI evidence, or used in a unified cross-platform workflow. Follow the adapter guidance in [app-device.md](app-device.md).
5. **Raw CDP, Puppeteer, or React DevTools**: use when the bug requires low-level runtime evaluation, performance tracing, heap inspection, React render profiling, or when existing tools expose that route directly.

Before using a non-repo tool, detect it:

```bash
command -v agent-browser
command -v agent-device
```

If agent-browser is needed but unavailable, suggest:

```bash
npm install -g agent-browser
agent-browser install
```

If agent-device web is needed but unavailable, suggest:

```bash
npm install -g agent-device@latest
agent-device web setup
agent-device web doctor
```

## agent-browser workflow

Read `agent-browser --help` before planning commands. See the [official command reference](https://github.com/vercel-labs/agent-browser#commands) for current options.

1. Open the app at its actual development URL with `agent-browser open <url>`.
2. Run `agent-browser snapshot -i` to get interactive elements and their refs.
3. Use refs from that snapshot with `agent-browser click @e1` or `agent-browser fill @e2 "text"`. The example refs are placeholders.
4. After navigation or a page change, take a new snapshot before selecting the next ref. Wait for the expected element, text, or URL when the transition is asynchronous.
5. Capture the state that proves the symptom. Use `agent-browser snapshot` for the full accessibility tree, including non-interactive content.

Inspect additional evidence as needed:

```bash
agent-browser get url
agent-browser console
agent-browser errors
agent-browser network requests
agent-browser screenshot browser-bug.png
```

Save a screenshot only when visual layout matters. Compare the observed state with an explicit expected result. A successful CLI command alone does not prove that the bug is fixed.

Close a browser session created for the investigation with `agent-browser close` when the work is complete. Preserve sessions the user is still using.

## React web defaults

| Target | Preferred approach |
| --- | --- |
| React DOM app | Existing browser tests, then host browser automation, then agent-browser |
| React Native Web app | Host browser automation or agent-browser first; use mobile tools only when comparing native behavior |
| Storybook repro | Existing Storybook test runner or agent-browser against Storybook |
| Hydration or SSR bug | Framework dev server plus browser console/network evidence |
| Render performance bug | React DevTools/profiler or browser performance tooling before adding logs |

## Evidence to capture

For browser bugs, prefer evidence that can become a regression:

- failing browser test or script
- console error with source location
- network request/response mismatch
- DOM state or accessible role/name mismatch
- screenshot only when visual layout matters
- performance trace or React profiler result for performance claims

Do not stop when the symptom merely disappears if the same behavior can be asserted through DOM, URL, console, network, or test state.
