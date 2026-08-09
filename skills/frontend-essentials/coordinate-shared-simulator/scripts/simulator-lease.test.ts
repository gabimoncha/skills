import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./simulator-lease.ts", import.meta.url));
const UDID = "SIM/ONE";

interface Fixture {
  root: string;
  repository: string;
  worktree: string;
  commonDir: string;
}

interface Result {
  exitCode: number;
  json: Record<string, any>;
}

let fixture: Fixture;

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", "-C", cwd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function run(command: string, worktree: string, ...args: string[]): Result {
  const result = Bun.spawnSync([
    process.execPath,
    SCRIPT,
    command,
    "--worktree",
    worktree,
    "--udid",
    UDID,
    ...args,
  ]);
  const stdout = result.stdout.toString().trim();
  return {
    exitCode: result.exitCode,
    json: stdout ? JSON.parse(stdout) : {},
  };
}

function ownerArgs(overrides: Record<string, string> = {}): string[] {
  const owner = {
    "coordination-id": "coord-1",
    generation: "1",
    "lease-token": "lease-token-1",
    "controller-task-id": "controller-1",
    ...overrides,
  };
  return Object.entries(owner).flatMap(([key, value]) => [`--${key}`, value]);
}

function acquire(worktree = fixture.repository, ...extra: string[]): Result {
  return run(
    "acquire",
    worktree,
    ...ownerArgs(),
    "--active-task-id",
    "task-1",
    "--participant-task-id",
    "task-1",
    "--participant-task-id",
    "task-2",
    "--metro-port",
    "8081",
    "--purpose",
    "verify shared simulator",
    ...extra,
  );
}

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), "simulator-lease-test-"));
  const repository = join(root, "repository");
  const worktree = join(root, "linked-worktree");
  mkdirSync(repository);
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Lease Test");
  git(repository, "config", "user.email", "lease@example.invalid");
  writeFileSync(join(repository, "tracked.txt"), "fixture\n");
  git(repository, "add", "tracked.txt");
  git(repository, "commit", "-m", "fixture");
  git(repository, "worktree", "add", "-b", "linked", worktree);
  fixture = {
    root,
    repository,
    worktree,
    commonDir: git(
      repository,
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    ),
  };
});

afterEach(() => {
  rmSync(fixture.root, { recursive: true, force: true });
});

describe("simulator lease CLI", () => {
  test("uses one absolute lease path for a repository and its linked worktree", () => {
    const repositoryStatus = run("status", fixture.repository);
    const worktreeStatus = run("status", fixture.worktree);

    expect(repositoryStatus.exitCode).toBe(0);
    expect(worktreeStatus.exitCode).toBe(0);
    expect(repositoryStatus.json.leasePath).toBe(worktreeStatus.json.leasePath);
    expect(repositoryStatus.json.leasePath).toBe(
      join(
        fixture.commonDir,
        "codex-coordination",
        "ios-simulator",
        "SIM_ONE.lock",
      ),
    );
  });

  test("acquires atomically and reports the existing metadata on collision", () => {
    const first = acquire(fixture.worktree);
    const collision = run(
      "acquire",
      fixture.repository,
      ...ownerArgs({
        "coordination-id": "coord-2",
        generation: "2",
        "lease-token": "lease-token-2",
      }),
    );

    expect(first.exitCode).toBe(0);
    expect(first.json.lease.schemaVersion).toBe(1);
    expect(first.json.lease.activeWorktree).toBe(fixture.worktree);
    expect(first.json.lease.branch).toBe("linked");
    expect(collision.exitCode).toBe(1);
    expect(collision.json.error.code).toBe("LEASE_OCCUPIED");
    expect(collision.json.error.metadataState).toBe("valid");
    expect(collision.json.error.lease.coordinationId).toBe("coord-1");
  });

  test("rejects an active worktree from another repository", () => {
    const otherRepository = join(fixture.root, "other-repository");
    mkdirSync(otherRepository);
    git(otherRepository, "init", "-b", "main");

    const result = run(
      "acquire",
      fixture.repository,
      ...ownerArgs(),
      "--active-task-id",
      "task-1",
      "--participant-task-id",
      "task-1",
      "--active-worktree",
      otherRepository,
    );

    expect(result.exitCode).toBe(1);
    expect(result.json.error.code).toBe("GIT_COMMON_DIR_MISMATCH");
    expect(run("status", fixture.repository).json.occupied).toBe(false);
  });

  test("rejects the wrong lease token or controller for update and release", () => {
    expect(acquire().exitCode).toBe(0);

    const badUpdate = run(
      "update",
      fixture.repository,
      ...ownerArgs({ "lease-token": "wrong" }),
      "--state",
      "handover",
    );
    const badRelease = run(
      "release",
      fixture.repository,
      ...ownerArgs({ "controller-task-id": "wrong" }),
    );
    const status = run("status", fixture.worktree);

    expect(badUpdate.exitCode).toBe(1);
    expect(badUpdate.json.error.code).toBe("LEASE_OWNER_MISMATCH");
    expect(badUpdate.json.error.mismatchedFields).toEqual(["leaseToken"]);
    expect(badRelease.exitCode).toBe(1);
    expect(badRelease.json.error.mismatchedFields).toEqual([
      "controllerTaskId",
    ]);
    expect(status.json.occupied).toBe(true);
    expect(status.json.lease.state).toBe("active");
  });

  test("updates only mutable fields with an atomic replacement", () => {
    const acquired = acquire();
    const heartbeatAt = "2030-01-02T03:04:05.000Z";
    const updated = run(
      "update",
      fixture.worktree,
      ...ownerArgs(),
      "--state",
      "handover",
      "--active-task-id",
      "task-2",
      "--active-worktree",
      fixture.worktree,
      "--branch",
      "linked",
      "--metro-port",
      "none",
      "--purpose",
      "capture screenshot",
      "--heartbeat-at",
      heartbeatAt,
    );
    const forbidden = run(
      "update",
      fixture.repository,
      ...ownerArgs(),
      "--participant-task-id",
      "task-3",
    );

    expect(updated.exitCode).toBe(0);
    expect(updated.json.lease).toMatchObject({
      state: "handover",
      activeTaskId: "task-2",
      activeWorktree: fixture.worktree,
      branch: "linked",
      metroPort: null,
      purpose: "capture screenshot",
      heartbeatAt,
    });
    expect(updated.json.lease.acquiredAt).toBe(acquired.json.lease.acquiredAt);
    expect(updated.json.lease.participantTaskIds).toEqual(["task-1", "task-2"]);
    expect(forbidden.exitCode).toBe(1);
    expect(forbidden.json.error.code).toBe("INVALID_ARGUMENT");
    expect(readdirSync(updated.json.leasePath).sort()).toEqual(["owner.json"]);
  });

  test("releases only for the exact owner and removes the empty lock directory", () => {
    const acquired = acquire();
    const released = run("release", fixture.worktree, ...ownerArgs());
    const status = run("status", fixture.repository);

    expect(released.exitCode).toBe(0);
    expect(released.json.lease.coordinationId).toBe(
      acquired.json.lease.coordinationId,
    );
    expect(status.exitCode).toBe(0);
    expect(status.json).toMatchObject({
      occupied: false,
      metadataState: "absent",
    });
  });

  test.each(["empty", "malformed"])(
    "treats %s lease metadata as occupied",
    (kind) => {
      const status = run("status", fixture.repository);
      const leasePath = status.json.leasePath as string;
      mkdirSync(leasePath, { recursive: true });
      if (kind === "malformed")
        writeFileSync(join(leasePath, "owner.json"), "{not-json\n");

      const occupied = run("status", fixture.worktree);
      const collision = acquire(fixture.worktree);

      expect(occupied.exitCode).toBe(0);
      expect(occupied.json).toMatchObject({
        occupied: true,
        metadataState: "malformed",
      });
      expect(collision.exitCode).toBe(1);
      expect(collision.json.error).toMatchObject({
        code: "LEASE_OCCUPIED",
        metadataState: "malformed",
      });
      if (kind === "malformed") {
        expect(readFileSync(join(leasePath, "owner.json"), "utf8")).toBe(
          "{not-json\n",
        );
      } else {
        expect(readdirSync(leasePath)).toEqual([]);
      }
    },
  );
});
