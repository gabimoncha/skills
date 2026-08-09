# Simulator lease helper

Use this reference only for `handshake` or `lease` mode after task participants have reached `READY` and `YIELDED`. The helper stores an atomic, per-UDID lock under the repository's absolute shared Git directory, so linked worktrees observe the same owner.

## Resolve the helper and identity

Resolve `SKILL_DIR` to the directory containing this skill's `SKILL.md`:

```bash
LEASE_HELPER="$SKILL_DIR/scripts/simulator-lease.ts"
TOKEN="$(uuidgen | tr '[:upper:]' '[:lower:]')"
```

Use one exact value for each identity field throughout an epoch:

- `WORKTREE`: any participant checkout in the shared repository;
- `UDID`: pinned simulator identifier;
- `COORDINATION_ID`: one coordination run;
- `GENERATION`: positive integer epoch;
- `TOKEN`: fresh opaque token for this grant;
- `CONTROLLER_TASK_ID`: registered control tower.

## Inspect

```bash
bun "$LEASE_HELPER" status \
  --worktree "$WORKTREE" \
  --udid "$UDID"
```

`occupied=false` means no lock. `occupied=true` with `metadataState=valid` reports its current owner. `metadataState=malformed` remains occupied and requires explicit recovery; age alone never makes it free.

## Acquire before GRANT

Repeat `--participant-task-id` for every enrolled task:

```bash
bun "$LEASE_HELPER" acquire \
  --worktree "$WORKTREE" \
  --udid "$UDID" \
  --coordination-id "$COORDINATION_ID" \
  --generation "$GENERATION" \
  --lease-token "$TOKEN" \
  --controller-task-id "$CONTROLLER_TASK_ID" \
  --active-task-id "$ACTIVE_TASK_ID" \
  --participant-task-id "$TASK_ID_1" \
  --participant-task-id "$TASK_ID_2" \
  --active-worktree "$ACTIVE_WORKTREE" \
  --branch "$ACTIVE_BRANCH" \
  --metro-port "${METRO_PORT:-none}" \
  --purpose "$BOUNDED_PURPOSE" \
  --state grant-pending
```

An atomic-directory collision exits nonzero with `LEASE_OCCUPIED`. The command never steals or replaces an existing lease.

## Activate or hand over

After the owner acknowledges the GRANT, mark the lock active. `update` accepts only state, active task/worktree, branch, Metro port, purpose, and heartbeat time; ownership and participants stay immutable:

```bash
bun "$LEASE_HELPER" update \
  --worktree "$WORKTREE" \
  --udid "$UDID" \
  --coordination-id "$COORDINATION_ID" \
  --generation "$GENERATION" \
  --lease-token "$TOKEN" \
  --controller-task-id "$CONTROLLER_TASK_ID" \
  --state active
```

For a handover within the same enrolled epoch, also pass the new `--active-task-id`, `--active-worktree`, `--branch`, and `--metro-port`. The new active task must already be in `participantTaskIds`.

## Release after RESTORED verification

```bash
bun "$LEASE_HELPER" release \
  --worktree "$WORKTREE" \
  --udid "$UDID" \
  --coordination-id "$COORDINATION_ID" \
  --generation "$GENERATION" \
  --lease-token "$TOKEN" \
  --controller-task-id "$CONTROLLER_TASK_ID"
```

Release validates all four owner fields, removes `owner.json`, and removes only the now-empty lock directory. It never recursively deletes lease state. A mismatch or nonempty directory exits nonzero and stays blocked for inspection.

Every command prints one JSON object. Treat `ok=false` or a nonzero exit as a failed transition and preserve the previous logical ledger state.
