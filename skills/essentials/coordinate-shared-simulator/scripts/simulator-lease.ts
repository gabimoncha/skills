import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

const SCHEMA_VERSION = 1;
const METADATA_FILE = "owner.json";
const METADATA_KEYS = [
  "schemaVersion",
  "coordinationId",
  "generation",
  "leaseToken",
  "controllerTaskId",
  "activeTaskId",
  "participantTaskIds",
  "udid",
  "activeWorktree",
  "branch",
  "metroPort",
  "purpose",
  "state",
  "acquiredAt",
  "heartbeatAt",
] as const;

type Command = "status" | "acquire" | "update" | "release";
type Options = Map<string, string[]>;

interface LeaseMetadata {
  schemaVersion: 1;
  coordinationId: string;
  generation: number;
  leaseToken: string;
  controllerTaskId: string;
  activeTaskId: string;
  participantTaskIds: string[];
  udid: string;
  activeWorktree: string;
  branch: string;
  metroPort: number | null;
  purpose: string;
  state: string;
  acquiredAt: string;
  heartbeatAt: string;
}

interface LeaseLocation {
  commonDir: string;
  leasePath: string;
  metadataPath: string;
  udid: string;
  worktree: string;
}

interface LeaseInspection {
  occupied: boolean;
  metadataState: "absent" | "valid" | "malformed";
  lease?: LeaseMetadata;
}

class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const COMMON_OPTIONS = new Set(["worktree", "udid"]);
const OWNER_OPTIONS = new Set([
  "coordination-id",
  "generation",
  "lease-token",
  "controller-task-id",
]);
const UPDATE_OPTIONS = new Set([
  "state",
  "active-task-id",
  "active-worktree",
  "branch",
  "metro-port",
  "purpose",
  "heartbeat-at",
]);

function emit(value: Record<string, unknown>): void {
  console.log(JSON.stringify(value));
}

function parseArgs(argv: string[]): { command: Command; options: Options } {
  const [rawCommand, ...args] = argv;
  if (
    !rawCommand ||
    !["status", "acquire", "update", "release"].includes(rawCommand)
  ) {
    throw new CliError(
      "INVALID_COMMAND",
      "Expected one command: status, acquire, update, or release.",
    );
  }

  const options: Options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith("--")) {
      throw new CliError(
        "INVALID_ARGUMENT",
        `Unexpected positional argument: ${argument ?? ""}`,
      );
    }

    const separator = argument.indexOf("=");
    const key = argument.slice(2, separator === -1 ? undefined : separator);
    let value =
      separator === -1 ? args[++index] : argument.slice(separator + 1);
    if (
      !key ||
      value === undefined ||
      (separator === -1 && value.startsWith("--"))
    ) {
      throw new CliError(
        "INVALID_ARGUMENT",
        `Option --${key || "?"} requires a value.`,
      );
    }

    const current = options.get(key) ?? [];
    current.push(value);
    options.set(key, current);
  }

  return { command: rawCommand as Command, options };
}

function allowedOptions(command: Command): Set<string> {
  if (command === "status") return COMMON_OPTIONS;
  const allowed = new Set([...COMMON_OPTIONS, ...OWNER_OPTIONS]);
  if (command === "acquire") {
    for (const option of UPDATE_OPTIONS) allowed.add(option);
    allowed.delete("heartbeat-at");
    allowed.add("participant-task-id");
  }
  if (command === "update") {
    for (const option of UPDATE_OPTIONS) allowed.add(option);
  }
  return allowed;
}

function validateOptions(command: Command, options: Options): void {
  const allowed = allowedOptions(command);
  for (const [key, values] of options) {
    if (!allowed.has(key)) {
      throw new CliError(
        "INVALID_ARGUMENT",
        `Option --${key} is not allowed for ${command}.`,
      );
    }
    if (key !== "participant-task-id" && values.length !== 1) {
      throw new CliError(
        "INVALID_ARGUMENT",
        `Option --${key} may only be provided once.`,
      );
    }
  }
}

function option(options: Options, key: string): string | undefined {
  return options.get(key)?.[0];
}

function requiredOption(options: Options, key: string): string {
  const value = option(options, key)?.trim();
  if (!value)
    throw new CliError("INVALID_ARGUMENT", `Missing required option --${key}.`);
  return value;
}

function safeText(value: string, name: string, maxLength = 512): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\0\r\n]/.test(trimmed)) {
    throw new CliError(
      "INVALID_ARGUMENT",
      `${name} must be non-empty, single-line text.`,
    );
  }
  return trimmed;
}

function safePurpose(value: string): string {
  const purpose = safeText(value, "purpose", 500);
  if (/\b(?:https?|exp|exps):\/\//i.test(purpose)) {
    throw new CliError("INVALID_ARGUMENT", "purpose must not contain a URL.");
  }
  return purpose;
}

function parseGeneration(value: string): number {
  const generation = Number(value);
  if (!Number.isSafeInteger(generation) || generation < 1) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "generation must be a positive integer.",
    );
  }
  return generation;
}

function parseMetroPort(value: string | undefined): number | null {
  if (value === undefined || value === "none" || value === "null") return null;
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "metro-port must be 1-65535, none, or null.",
    );
  }
  return port;
}

function parseTimestamp(value: string, name: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf()) || timestamp.toISOString() !== value) {
    throw new CliError(
      "INVALID_ARGUMENT",
      `${name} must be an ISO-8601 UTC timestamp.`,
    );
  }
  return value;
}

function sanitizeUdid(udid: string): string {
  const sanitized = udid.replace(/[^A-Za-z0-9._-]/g, "_");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new CliError(
      "INVALID_ARGUMENT",
      "udid does not contain a usable filename character.",
    );
  }
  return sanitized;
}

function git(worktree: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", "-C", worktree, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    const detail = result.stderr.toString().trim();
    throw new CliError("GIT_ERROR", detail || `git ${args.join(" ")} failed.`);
  }
  return result.stdout.toString().trim();
}

function resolveLeaseLocation(options: Options): LeaseLocation {
  const worktree = resolve(requiredOption(options, "worktree"));
  const udid = safeText(requiredOption(options, "udid"), "udid", 256);
  const commonDir = git(
    worktree,
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  );
  if (!isAbsolute(commonDir)) {
    throw new CliError(
      "GIT_ERROR",
      "git returned a non-absolute common directory.",
    );
  }
  const leasePath = join(
    commonDir,
    "codex-coordination",
    "ios-simulator",
    `${sanitizeUdid(udid)}.lock`,
  );
  return {
    commonDir,
    leasePath,
    metadataPath: join(leasePath, METADATA_FILE),
    udid,
    worktree,
  };
}

function assertSharedRepository(
  leaseCommonDir: string,
  activeWorktree: string,
): void {
  const activeCommonDir = git(
    activeWorktree,
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  );
  if (resolve(activeCommonDir) !== resolve(leaseCommonDir)) {
    throw new CliError(
      "GIT_COMMON_DIR_MISMATCH",
      "active-worktree must belong to the lease repository.",
      { leaseCommonDir, activeCommonDir },
    );
  }
}

function isErrno(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function isLeaseMetadata(value: unknown): value is LeaseMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join("\0") !== [...METADATA_KEYS].sort().join("\0")) return false;

  const strings = [
    "coordinationId",
    "leaseToken",
    "controllerTaskId",
    "activeTaskId",
    "udid",
    "activeWorktree",
    "branch",
    "purpose",
    "state",
    "acquiredAt",
    "heartbeatAt",
  ];
  if (strings.some((key) => typeof record[key] !== "string" || !record[key]))
    return false;
  if (record.schemaVersion !== SCHEMA_VERSION) return false;
  if (
    !Number.isSafeInteger(record.generation) ||
    (record.generation as number) < 1
  )
    return false;
  if (
    !Array.isArray(record.participantTaskIds) ||
    record.participantTaskIds.length === 0
  ) {
    return false;
  }
  if (record.participantTaskIds.some((id) => typeof id !== "string" || !id))
    return false;
  if (!record.participantTaskIds.includes(record.activeTaskId)) return false;
  if (!isAbsolute(record.activeWorktree as string)) return false;
  if (
    record.metroPort !== null &&
    (!Number.isSafeInteger(record.metroPort) ||
      (record.metroPort as number) < 1 ||
      (record.metroPort as number) > 65_535)
  ) {
    return false;
  }
  for (const key of ["acquiredAt", "heartbeatAt"] as const) {
    const date = new Date(record[key] as string);
    if (Number.isNaN(date.valueOf()) || date.toISOString() !== record[key])
      return false;
  }
  return true;
}

async function inspectLease(location: LeaseLocation): Promise<LeaseInspection> {
  try {
    const leaseStat = await lstat(location.leasePath);
    if (!leaseStat.isDirectory())
      return { occupied: true, metadataState: "malformed" };
  } catch (error) {
    if (isErrno(error, "ENOENT"))
      return { occupied: false, metadataState: "absent" };
    throw error;
  }

  try {
    const value: unknown = JSON.parse(
      await readFile(location.metadataPath, "utf8"),
    );
    return isLeaseMetadata(value)
      ? { occupied: true, metadataState: "valid", lease: value }
      : { occupied: true, metadataState: "malformed" };
  } catch {
    return { occupied: true, metadataState: "malformed" };
  }
}

async function writeMetadataAtomic(
  metadataPath: string,
  lease: LeaseMetadata,
): Promise<void> {
  const temporaryPath = join(
    resolve(metadataPath, ".."),
    `.owner.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, `${JSON.stringify(lease, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryPath, metadataPath);
  } finally {
    try {
      await unlink(temporaryPath);
    } catch (error) {
      if (!isErrno(error, "ENOENT")) throw error;
    }
  }
}

function ownerFromOptions(options: Options) {
  return {
    coordinationId: safeText(
      requiredOption(options, "coordination-id"),
      "coordination-id",
    ),
    generation: parseGeneration(requiredOption(options, "generation")),
    leaseToken: safeText(requiredOption(options, "lease-token"), "lease-token"),
    controllerTaskId: safeText(
      requiredOption(options, "controller-task-id"),
      "controller-task-id",
    ),
  };
}

function assertOwner(lease: LeaseMetadata, options: Options): void {
  const owner = ownerFromOptions(options);
  const mismatchedFields = (
    Object.keys(owner) as Array<keyof typeof owner>
  ).filter((key) => lease[key] !== owner[key]);
  if (mismatchedFields.length > 0) {
    throw new CliError(
      "LEASE_OWNER_MISMATCH",
      "Lease ownership check failed.",
      {
        mismatchedFields,
      },
    );
  }
}

async function requireValidLease(
  location: LeaseLocation,
): Promise<LeaseMetadata> {
  const inspection = await inspectLease(location);
  if (!inspection.occupied) {
    throw new CliError("LEASE_NOT_FOUND", "No simulator lease exists.", {
      leasePath: location.leasePath,
    });
  }
  if (!inspection.lease) {
    throw new CliError(
      "LEASE_METADATA_MALFORMED",
      "The occupied lease metadata is malformed.",
      {
        leasePath: location.leasePath,
      },
    );
  }
  return inspection.lease;
}

async function status(location: LeaseLocation): Promise<void> {
  const inspection = await inspectLease(location);
  emit({
    ok: true,
    command: "status",
    leasePath: location.leasePath,
    ...inspection,
  });
}

async function acquire(
  location: LeaseLocation,
  options: Options,
): Promise<void> {
  const owner = ownerFromOptions(options);
  const activeTaskId = safeText(
    option(options, "active-task-id") ?? owner.controllerTaskId,
    "active-task-id",
  );
  const suppliedParticipants = options.get("participant-task-id") ?? [];
  const participantTaskIds = [
    ...new Set(
      (suppliedParticipants.length > 0
        ? suppliedParticipants
        : [activeTaskId]
      ).map((id) => safeText(id, "participant-task-id")),
    ),
  ];
  if (!participantTaskIds.includes(activeTaskId)) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "active-task-id must be included among participant-task-id values.",
    );
  }

  const activeWorktree = resolve(
    option(options, "active-worktree") ?? location.worktree,
  );
  assertSharedRepository(location.commonDir, activeWorktree);
  const now = new Date().toISOString();
  const lease: LeaseMetadata = {
    schemaVersion: SCHEMA_VERSION,
    ...owner,
    activeTaskId,
    participantTaskIds,
    udid: location.udid,
    activeWorktree,
    branch: safeText(
      option(options, "branch") ??
        git(activeWorktree, "branch", "--show-current"),
      "branch",
    ),
    metroPort: parseMetroPort(option(options, "metro-port")),
    purpose: safePurpose(option(options, "purpose") ?? "shared iOS simulator"),
    state: safeText(option(options, "state") ?? "active", "state"),
    acquiredAt: now,
    heartbeatAt: now,
  };

  await mkdir(resolve(location.leasePath, "../"), { recursive: true });
  try {
    await mkdir(location.leasePath);
  } catch (error) {
    if (!isErrno(error, "EEXIST")) throw error;
    const existing = await inspectLease(location);
    throw new CliError(
      "LEASE_OCCUPIED",
      "The simulator lease is already occupied.",
      {
        leasePath: location.leasePath,
        metadataState: existing.metadataState,
        ...(existing.lease ? { lease: existing.lease } : {}),
      },
    );
  }

  try {
    await writeMetadataAtomic(location.metadataPath, lease);
  } catch (error) {
    try {
      await unlink(location.metadataPath);
    } catch (cleanupError) {
      if (!isErrno(cleanupError, "ENOENT")) throw cleanupError;
    }
    try {
      await rmdir(location.leasePath);
    } catch {
      // An incomplete directory remains occupied for explicit inspection.
    }
    throw error;
  }

  emit({ ok: true, command: "acquire", leasePath: location.leasePath, lease });
}

async function update(
  location: LeaseLocation,
  options: Options,
): Promise<void> {
  const current = await requireValidLease(location);
  assertOwner(current, options);

  const activeTaskId = option(options, "active-task-id")
    ? safeText(requiredOption(options, "active-task-id"), "active-task-id")
    : current.activeTaskId;
  if (!current.participantTaskIds.includes(activeTaskId)) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "active-task-id must identify an existing participant.",
    );
  }

  const activeWorktree = option(options, "active-worktree")
    ? resolve(requiredOption(options, "active-worktree"))
    : current.activeWorktree;
  assertSharedRepository(location.commonDir, activeWorktree);

  const next: LeaseMetadata = {
    ...current,
    state: option(options, "state")
      ? safeText(requiredOption(options, "state"), "state")
      : current.state,
    activeTaskId,
    activeWorktree,
    branch: option(options, "branch")
      ? safeText(requiredOption(options, "branch"), "branch")
      : current.branch,
    metroPort: options.has("metro-port")
      ? parseMetroPort(requiredOption(options, "metro-port"))
      : current.metroPort,
    purpose: option(options, "purpose")
      ? safePurpose(requiredOption(options, "purpose"))
      : current.purpose,
    heartbeatAt: option(options, "heartbeat-at")
      ? parseTimestamp(requiredOption(options, "heartbeat-at"), "heartbeat-at")
      : new Date().toISOString(),
  };

  await writeMetadataAtomic(location.metadataPath, next);
  emit({
    ok: true,
    command: "update",
    leasePath: location.leasePath,
    lease: next,
  });
}

async function release(
  location: LeaseLocation,
  options: Options,
): Promise<void> {
  const current = await requireValidLease(location);
  assertOwner(current, options);

  await unlink(location.metadataPath);
  try {
    await rmdir(location.leasePath);
  } catch (error) {
    throw new CliError(
      "LEASE_RELEASE_INCOMPLETE",
      "owner.json was removed, but the lease directory was not empty.",
      { leasePath: location.leasePath },
    );
  }
  emit({
    ok: true,
    command: "release",
    leasePath: location.leasePath,
    lease: current,
  });
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(Bun.argv.slice(2));
  validateOptions(command, options);
  const location = resolveLeaseLocation(options);
  if (command === "status") return status(location);
  if (command === "acquire") return acquire(location, options);
  if (command === "update") return update(location, options);
  return release(location, options);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    if (error instanceof CliError) {
      emit({
        ok: false,
        error: { code: error.code, message: error.message, ...error.details },
      });
    } else {
      emit({
        ok: false,
        error: {
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
    process.exitCode = 1;
  }
}
