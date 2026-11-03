---
name: t3-pr-review-webhook
description: Set up webhook-triggered PR reviews in T3 Code for a GitHub repository. Each new or ready PR gets its own thread that reviews it with read-only delegates, publishes the review, and watches for new pushes.
disable-model-invocation: true
metadata:
  internal: true
---

# T3 PR review webhook

Set up a **review task** for a target repository: one T3 webhook task and its
own GitHub repository webhook. Each matching PR event starts a new thread with
the run prompt from [references/run-prompt.md](references/run-prompt.md). That
thread reviews the PR, publishes the review, and watches the PR.

The task and its threads run on the T3 environment of this thread. That host
must stay running, and its `gh` login must work, or no review runs.

Keep the signing secret out of the transcript. The user enters it only in
`request_secret` cards. You pass only a `secretRef` or a file path.

## Check the prerequisites

Stop at the first failed check. Tell the user the fix.

1. Check GitHub access: `gh auth status` must pass. Then resolve the
   repository: `gh repo view <arg> --json nameWithOwner,viewerPermission,url`.
   Use `nameWithOwner` exactly as GitHub returns it, because the repository
   filter compares case-sensitive text. `viewerPermission` must be `ADMIN`,
   because only an admin can add a repository webhook.
2. Check the project. Get this thread's id from `parentThreadId` in
   `orchestrator_capabilities`, and its `projectId` from `t3_thread_read`.
   Read the project with `t3_project_read`. Its `repositoryIdentity.displayName`
   (or, if that is null, `git -C <workspaceRoot> remote get-url origin`) must
   name `nameWithOwner`; ignore case. If not, stop. Tell the user to open a
   thread in that repository's T3 project and invoke this skill there. If no
   project has the repository, offer to clone it with `t3_project_clone` and
   register it with `t3_project_create`, so the user can open that thread.
   The reason: a `secretRef` works only in the project of the thread that
   asked for it.
3. Check the run settings. Each run thread gets this thread's model, runtime
   mode, and interaction mode, from `orchestrator_capabilities`.
   `interactionMode` must be `default`. `runtimeMode` must be `auto` or
   `full-access`, because a run thread that waits for an approval stalls with
   nobody there.
4. Find the existing review tasks: `list_scheduled_tasks` with the
   `projectId`. A review task has a title that starts with
   `T3 PR review webhook: <nameWithOwner>`, `schedule.type` `webhook`, and a
   filter `body.repository.full_name` `equals` `<nameWithOwner>`. Read each
   one's author scope from its `schedule.filters`, not from its title (see
   "Author scopes").

## Ask the user

If review tasks exist, list them first: title, author scope, and the
`Trusted settings` line of the task's `prompt`. Then ask all questions in
one message. Skip a question that the user already answered.

1. **Publish mode.** Publish each review as a GitHub review with the `COMMENT`
   event (`github`), or keep it only in the T3 thread (`thread`).
2. **PR authors.** Review PRs from all authors, only from some authors (for
   example, only Dependabot and Renovate), or from all authors except some.
3. **Push check interval.** How often each review thread checks its PR for
   new pushes, a merge, or a close. Offer 15 minutes, 1 hour, and 4 hours, or
   another value of at least 1 minute. A new push gets its review on the next
   check.
4. **Review model.** Default: `gpt-6.1-sol` on a Codex provider, with
   `reasoningEffort` `high`. Offer the other models from
   `orchestrator_capabilities`.
5. Only if review tasks exist: **add** a new task beside them, **replace**
   one or more of them, or **stop**.

If the user chose stop, end here. Report the existing tasks.

For the review model, find it in `orchestrator_capabilities` (use `search`).
Keep its `providerInstanceId`, and build the options object from the option
ids listed for that model, such as `{"reasoningEffort": "high"}` for Codex or
`{"effort": "high"}` for Claude. If the provider lists `constraints` or no
such model, ask again.

For an author list, get the exact GitHub logins. The filter compares exact,
case-sensitive text, and bot logins end in `[bot]`. A self-hosted Renovate
uses its own app's login. Confirm the logins against recent PR authors. The
REST API returns them in the same form as the webhook payload:
`gh api 'repos/<nameWithOwner>/pulls?state=all&per_page=100' --jq '[.[].user.login] | unique'`.

## Author scopes

A scope is one of three kinds. Each kind maps to filters on
`body.pull_request.user.login`:

| Scope | Filters | Title suffix |
| --- | --- | --- |
| All authors | none | `(all authors)` |
| Only `A` | one `in` filter: `{"path": "body.pull_request.user.login", "op": "in", "value": [<A>]}` | `(only a1, a2)` |
| All except `E` | one `notEquals` filter per login in `E` | `(all except e1, e2)` |

A task takes at most 16 filters, so at most 12 excluded logins.

Two scopes overlap when one login can match both:

- All authors overlaps every scope.
- Only `A1` and only `A2` overlap when `A1` and `A2` share a login.
- Only `A` and all except `E` overlap when a login in `A` is not in `E`.
- All except `E1` and all except `E2` always overlap.

Compare the new scope with each existing task that stays. Replaced tasks do
not count. If a scope overlaps, name the task and the logins that match
both, and ask the user to narrow a scope. A common split is only
`dependabot[bot], renovate[bot]` in one task, and all except the same
logins in the other.

## Create the T3 webhook task

1. Tell the user to make a new random secret for this review task in their
   own terminal or password manager, for example with
   `openssl rand -hex 32`. They paste the same value into two cards: card 1
   for T3, card 2 for GitHub.
2. Call `request_secret` with
   `label: "Webhook secret for <title> (card 1 of 2)"` and
   `reason: "T3 checks the GitHub webhook signature with this secret."`.
   Keep the `secretRef`.
3. Build the prompt. Copy the template from
   [references/run-prompt.md](references/run-prompt.md), and fill in its
   placeholders.
4. Call `schedule_task`:

   ```json
   {
     "title": "T3 PR review webhook: <nameWithOwner> <title suffix>",
     "projectId": "<projectId>",
     "bindToCurrentThread": false,
     "clientRequestId": "t3-pr-review-webhook:<nameWithOwner>:<UTC timestamp>",
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
         { "path": "body.repository.full_name", "op": "equals", "value": "<nameWithOwner>" },
         <author filters>
       ],
       "dedupe": {
         "replayKey": "{{headers.x-github-delivery}}",
         "coalesceKey": "{{body.repository.full_name}}#{{body.number}}",
         "coalesceWindowSeconds": 60
       }
     }
   }
   ```

   Replace `<author filters>` with the filters of the scope, or remove it for
   all authors. The coalesce window joins `opened` and `ready_for_review`
   events for one PR into one run.

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

1. Call `request_secret` with `delivery: "file"`,
   `label: "Webhook secret for <title> (card 2 of 2, same value as card 1)"`,
   and `reason: "GitHub signs each webhook delivery with this secret."`.
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

   - `202`: delivery and the signature work. The first review runs on the
     next matching PR event.
   - `401`: the two secrets differ. Ask for card 2 again, with the same value
     the user entered in card 1. Send it with
     `gh api -X PATCH repos/<nameWithOwner>/hooks/<id>/config -F 'secret=@<file>'`,
     and remove the file. Send a new ping with
     `gh api -X POST repos/<nameWithOwner>/hooks/<id>/pings`, then check
     again.
   - No delivery yet: wait a few seconds, then check again.
   - Any other code: report it, with the T3 task's **Deliveries** view as the
     next place to look.

## Remove a review task

Do this for each task the user chose to replace, after the new task's ping
returns `202`. Show each task to delete, with its GitHub hook, and wait for
a yes. The same steps remove any review task:

1. Find its hook:
   `gh api repos/<nameWithOwner>/hooks --paginate --jq '.[] | select(.config.url == "<webhookUrl>") | .id'`.
2. Delete the hook: `gh api -X DELETE repos/<nameWithOwner>/hooks/<id>`.
3. Delete the task with `delete_scheduled_task`.

Open review threads of a removed task keep running until their PR is
merged or closed. To stop one, delete its task with the title
`PR review check: <nameWithOwner>#<N>`, and call `unwatch_pull_request` with
that thread's `threadId` and the PR `url`.

## Report

Give the user:

- the T3 task id, its title, and the `webhookUrl`;
- the GitHub hook id and the ping result;
- the publish mode, author scope, push check interval, and review model;
- the model and modes that run threads inherit from this thread;
- the other review tasks of the repository, if any;
- the steps in "Remove a review task".
