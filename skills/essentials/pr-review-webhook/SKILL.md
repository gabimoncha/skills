---
name: pr-review-webhook
description: Set up webhook-triggered PR reviews in T3 Code for a GitHub repository. Each new or ready PR gets its own thread that reviews it with read-only delegates, publishes the review, and watches for new pushes. Use when the user asks to set up or automate PR reviews for a repository.
metadata:
  internal: true
---

# PR review webhook

Set up one T3 webhook task and one GitHub repository webhook for a target
repository. Each matching PR event starts a new thread with the run prompt
from [references/run-prompt.md](references/run-prompt.md). That thread reviews
the PR, publishes the review, and watches the PR.

Keep the signing secret out of the transcript. The user enters it only in
`request_secret` cards. You pass only a `secretRef` or a file path.

## Check the prerequisites

Stop at the first failed check. Tell the user the fix.

1. Resolve the repository:
   `gh repo view <arg> --json nameWithOwner,viewerPermission,url`. Use
   `nameWithOwner` exactly as GitHub returns it. The repository filter
   compares text, and the comparison is case-sensitive. `viewerPermission`
   must be `ADMIN`, because only an admin can add a repository webhook.
2. Find the T3 project. Page through `t3_project_list`. Match
   `repositoryIdentity.displayName` to `nameWithOwner`, and ignore case. If
   `repositoryIdentity` is null, compare
   `git -C <workspaceRoot> remote get-url origin` instead.
   - If no project matches, offer to clone it with `t3_project_clone`, then
     register it with `t3_project_create`.
   - Get this thread's id from `t3_thread_configuration`, then get its
     `projectId` from `t3_thread_read`. If the project is not this thread's
     project, stop. Tell the user to open a thread in that project and invoke
     this skill there. The reason: a `secretRef` works only in the project of
     the thread that asked for it.
3. Check the run settings. Each run thread gets this thread's model, runtime
   mode, and interaction mode. Read them with `t3_thread_configuration`.
   `interactionMode` must be `default`. `runtimeMode` must be `auto` or
   `full-access`, because a run thread that waits for an approval stalls with
   nobody there.
4. Check the base branch. T3 starts each run thread in a new worktree from
   `main`. In the project's `workspaceRoot`, run
   `git rev-parse --verify --quiet refs/remotes/origin/main` and, if that
   fails, `git rev-parse --verify --quiet refs/heads/main`. If neither exists,
   stop: run threads cannot start.
5. Check the review model: `orchestrator_capabilities` with
   `search: "gpt-6.1-sol"` must list it under a Codex provider.
6. Check for an earlier setup: `list_scheduled_tasks` with the `projectId`.
   If a task has the title `PR review webhook: <nameWithOwner>`, ask the user
   whether to replace it or stop. To replace it, delete it and its GitHub
   hook first (see "Report").

## Ask how to publish

Ask the user one question: publish each review as a GitHub review with the
`COMMENT` event (`github`), or keep it only in the T3 thread (`thread`).

## Create the T3 webhook task

1. Tell the user to make a random secret in their own terminal or password
   manager, for example with `openssl rand -hex 32`. They paste the same value
   into two cards: card 1 for T3, card 2 for GitHub.
2. Call `request_secret` with `label: "Webhook secret for <nameWithOwner> (card 1 of 2)"`.
   Keep the `secretRef`.
3. Build the prompt. Copy the template from
   [references/run-prompt.md](references/run-prompt.md), and fill in
   `__REPO__` and `__PUBLISH__`.
4. Call `schedule_task`:

   ```json
   {
     "title": "PR review webhook: <nameWithOwner>",
     "projectId": "<projectId>",
     "bindToCurrentThread": false,
     "clientRequestId": "pr-review-webhook:<nameWithOwner>:<UTC timestamp>",
     "prompt": "<filled template>",
     "schedule": {
       "type": "webhook",
       "signature": {
         "header": "x-hub-signature-256",
         "encoding": "hex",
         "prefix": "sha256=",
         "secretRef": "<secretRef>"
       },
       "filters": [
         { "path": "headers.x-github-event", "op": "equals", "value": "pull_request" },
         { "path": "body.action", "op": "in", "value": ["opened", "reopened", "ready_for_review"] },
         { "path": "body.pull_request.draft", "op": "equals", "value": "false" },
         { "path": "body.repository.full_name", "op": "equals", "value": "<nameWithOwner>" }
       ],
       "dedupe": {
         "replayKey": "{{headers.x-github-delivery}}",
         "coalesceKey": "{{body.repository.full_name}}#{{body.number}}",
         "coalesceWindowSeconds": 60
       }
     }
   }
   ```

   Make the timestamp once per setup and reuse it for retries. The save
   spends the `secretRef`, and a retry with the same `clientRequestId` keeps
   the secret that the first save stored. If the call fails with no task
   saved, ask for a new card 1.
5. If the result has no `webhookUrl`, T3 Connect remote access is off.
   Delete the task with `delete_scheduled_task`. Tell the user to turn on
   **T3 Connect** in **Settings → Connections** on the desktop host, or to run
   `t3 connect` on a command-line host, and then to invoke this skill again.
   Stop.

## Register the GitHub webhook

This step changes the repository on GitHub. Show the user this summary and
wait for a yes:

- repository: `<nameWithOwner>`
- payload URL: the `webhookUrl`
- events: `pull_request` only
- content type: `application/json`
- secret: the value from card 2

If the user says no, ask whether to delete the T3 task or keep it for manual
setup in the repository's webhook settings.

1. Call `request_secret` with `delivery: "file"` and
   `label: "Webhook secret for <nameWithOwner> (card 2 of 2, same value)"`.
2. Create the hook. `-F` with `@` reads the value from the file, so the
   secret stays out of the command and its output:

   ```sh
   gh api repos/<nameWithOwner>/hooks \
     -f name=web -F active=true -f 'events[]=pull_request' \
     -f 'config[url]=<webhookUrl>' -f 'config[content_type]=json' \
     -f 'config[insecure_ssl]=0' -F 'config[secret]=@<file>' \
     --jq '{id, active, events}'
   rm -f <file>
   ```

   Run `rm -f <file>` also when `gh api` fails.
3. Check the ping. GitHub sends a `ping` event when it creates the hook. A
   correct signature makes T3 answer `202`, and the filters skip the run.

   ```sh
   gh api repos/<nameWithOwner>/hooks/<id>/deliveries \
     --jq '[.[] | select(.event == "ping")][0] | {status_code, delivered_at}'
   ```

   - `202`: the setup works.
   - `401`: the two secrets differ. Ask for a new card 2. Send the secret
     again with `gh api -X PATCH repos/<nameWithOwner>/hooks/<id>/config`
     and the same `config[...]` fields. Remove the file. Send a new ping with
     `gh api -X POST repos/<nameWithOwner>/hooks/<id>/pings`, then check
     again.
   - No delivery yet: wait a few seconds, then check again.
   - Any other code: report it, with the T3 task's **Deliveries** view as the
     next place to look.

## Report

Give the user:

- the T3 task id, its title, and the `webhookUrl`;
- the GitHub hook id and the ping result;
- the publish mode, and the model and modes that run threads inherit;
- how to remove the setup:
  1. `delete_scheduled_task` with the task id;
  2. `gh api -X DELETE repos/<nameWithOwner>/hooks/<id>`;
  3. for each open review thread, delete its task with the title
     `PR review hourly: <nameWithOwner>#<N>` (find it with
     `list_scheduled_tasks`), and call `unwatch_pull_request` with that
     thread's `threadId` and the PR `url`.
