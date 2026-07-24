import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { parseSkillFrontmatter, renderMarketplace } from "./sync-catalog.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const collectionName = "third-party-essentials";
const skillsRoot = path.join(repoRoot, "skills");
const collectionRoot = path.join(skillsRoot, collectionName);
const manifestPath = path.join(collectionRoot, "sources.json");
const lockPath = path.join(collectionRoot, "sources.lock.json");
const marketplacePath = path.join(
  repoRoot,
  ".claude-plugin",
  "marketplace.json",
);
const provenanceFile = "UPSTREAM.md";
const upstreamLicenseFile = "LICENSE.upstream";
const safeNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const commitPattern = /^[0-9a-f]{40,64}$/;
const spdxIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9.-]*\+?$/;

function fail(message) {
  throw new Error(message);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSafeRelativePath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    fail(`${label} must be a safe relative POSIX path.`);
  }
}

function validateManifest(manifest) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.skills)) {
    fail("sources.json must contain version 1 and a skills array.");
  }

  const seen = new Set();
  for (const entry of manifest.skills) {
    if (!safeNamePattern.test(entry?.name ?? "")) {
      fail(`Invalid third-party skill name: ${entry?.name ?? "(missing)"}.`);
    }
    if (seen.has(entry.name)) {
      fail(`Duplicate third-party manifest name: ${entry.name}.`);
    }
    seen.add(entry.name);
    if (typeof entry.repo !== "string" || entry.repo.length === 0) {
      fail(`${entry.name}: repo is required.`);
    }
    assertSafeRelativePath(entry.path, `${entry.name}: path`);
    if (
      typeof entry.ref !== "string" ||
      entry.ref.length === 0 ||
      entry.ref.startsWith("-") ||
      /\s/.test(entry.ref)
    ) {
      fail(`${entry.name}: ref is invalid.`);
    }
    if (typeof entry.author !== "string" || entry.author.trim().length === 0) {
      fail(`${entry.name}: author is required.`);
    }
    if (
      typeof entry.homepage !== "string" ||
      !/^https:\/\/[^/]/.test(entry.homepage)
    ) {
      fail(`${entry.name}: homepage must be an HTTPS URL.`);
    }
    if (!spdxIdentifierPattern.test(entry.license?.spdx ?? "")) {
      fail(`${entry.name}: license.spdx must be a valid SPDX identifier.`);
    }
    assertSafeRelativePath(
      entry.license?.file,
      `${entry.name}: license.file`,
    );
  }

  return manifest;
}

function validateLock(lock, manifest) {
  if (
    lock?.version !== 1 ||
    !lock.skills ||
    Array.isArray(lock.skills) ||
    typeof lock.skills !== "object"
  ) {
    fail("sources.lock.json must contain version 1 and a skills object.");
  }

  const expected = manifest.skills.map((entry) => entry.name).sort();
  const actual = Object.keys(lock.skills).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("sources.lock.json entries must exactly match sources.json.");
  }

  for (const name of expected) {
    const entry = lock.skills[name];
    if (!commitPattern.test(entry?.commit ?? "")) {
      fail(`${name}: lock commit must be a full hexadecimal Git object ID.`);
    }
    if (!/^[0-9a-f]{64}$/.test(entry?.hash ?? "")) {
      fail(`${name}: lock hash must be a SHA-256 digest.`);
    }
  }

  return lock;
}

function validateUpdateLock(lock, manifest) {
  if (
    lock?.version !== 1 ||
    !lock.skills ||
    Array.isArray(lock.skills) ||
    typeof lock.skills !== "object"
  ) {
    fail("sources.lock.json must contain version 1 and a skills object.");
  }

  const manifestNames = new Set(manifest.skills.map((entry) => entry.name));
  for (const [name, entry] of Object.entries(lock.skills)) {
    if (!manifestNames.has(name)) {
      fail(
        `${name}: lock entry is not declared in sources.json; remove it before updating.`,
      );
    }
    if (!commitPattern.test(entry?.commit ?? "")) {
      fail(`${name}: lock commit must be a full hexadecimal Git object ID.`);
    }
    if (!/^[0-9a-f]{64}$/.test(entry?.hash ?? "")) {
      fail(`${name}: lock hash must be a SHA-256 digest.`);
    }
  }

  return lock;
}

async function readJson(filePath, label) {
  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    fail(`${label} could not be read: ${error.message}`);
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed (${code}): ${
              stderr.trim() || stdout.trim()
            }`,
          ),
        );
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
    const relativePath = prefix
      ? path.posix.join(prefix, entry.name)
      : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`Generated snapshots do not allow symbolic links: ${relativePath}.`);
    }
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      fail(`Unsupported file type in snapshot: ${relativePath}.`);
    }
  }

  return files;
}

async function hashDirectory(directory) {
  const hash = createHash("sha256");
  for (const relativePath of await listFiles(directory)) {
    const filePath = path.join(directory, relativePath);
    const fileStat = await lstat(filePath);
    const contents = await readFile(filePath);
    hash.update(relativePath);
    hash.update("\0");
    hash.update((fileStat.mode & 0o111) !== 0 ? "100755" : "100644");
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function copyTree(source, destination) {
  const sourceStat = await lstat(source).catch((error) => {
    fail(`Missing upstream skill path ${source}: ${error.message}`);
  });
  if (!sourceStat.isDirectory()) {
    fail(`Upstream skill path is not a directory: ${source}.`);
  }

  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`Upstream skill contains unsupported symbolic link: ${entry.name}.`);
    }
    if (entry.isDirectory()) {
      await copyTree(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destinationPath);
      await chmod(destinationPath, (await lstat(sourcePath)).mode & 0o777);
    } else {
      fail(`Upstream skill contains an unsupported file type: ${entry.name}.`);
    }
  }
}

function provenance(entry, commit) {
  return `# Upstream provenance

This directory is a generated snapshot. Do not edit it by hand.

- Skill: \`${entry.name}\`
- Author: ${entry.author}
- Repository: ${entry.repo}
- Homepage: ${entry.homepage}
- Upstream path: \`${entry.path}\`
- Tracked ref: \`${entry.ref}\`
- Resolved commit: \`${commit}\`
- License: ${entry.license.spdx} (see \`${upstreamLicenseFile}\`)
`;
}

async function validateSnapshot(entry, locked, directory) {
  const skillPath = path.join(directory, "SKILL.md");
  const contents = await readFile(skillPath, "utf8").catch(() => {
    fail(`${entry.name}: snapshot is missing SKILL.md.`);
  });
  const metadata = parseSkillFrontmatter(contents);
  if (!metadata.name) {
    fail(`${entry.name}: SKILL.md is missing frontmatter name.`);
  }
  if (metadata.name !== entry.name) {
    fail(
      `${entry.name}: SKILL.md frontmatter name is "${metadata.name}", expected "${entry.name}".`,
    );
  }

  const expectedProvenance = provenance(entry, locked.commit);
  const currentProvenance = await readFile(
    path.join(directory, provenanceFile),
    "utf8",
  ).catch(() => "");
  if (currentProvenance !== expectedProvenance) {
    fail(`${entry.name}: upstream provenance is missing or out of date.`);
  }

  const license = await readFile(
    path.join(directory, upstreamLicenseFile),
    "utf8",
  ).catch(() => "");
  if (license.trim().length === 0) {
    fail(`${entry.name}: upstream license attribution is missing.`);
  }

  const hash = await hashDirectory(directory);
  if (hash !== locked.hash) {
    fail(
      `${entry.name}: snapshot hash drift (expected ${locked.hash}, found ${hash}).`,
    );
  }
}

async function assertNoDuplicateAuthoredNames(manifest) {
  const authoredRoot = path.join(skillsRoot, "essentials");
  const entries = await readdir(authoredRoot, { withFileTypes: true }).catch(
    () => [],
  );
  const thirdPartyNames = new Set(manifest.skills.map((entry) => entry.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const contents = await readFile(
      path.join(authoredRoot, entry.name, "SKILL.md"),
      "utf8",
    ).catch(() => null);
    if (contents === null) continue;
    const name = parseSkillFrontmatter(contents).name ?? entry.name;
    if (thirdPartyNames.has(name)) {
      fail(
        `Duplicate skill name "${name}" in essentials and third-party-essentials.`,
      );
    }
  }
}

async function validateCollection(manifest, lock, root = collectionRoot) {
  await assertNoDuplicateAuthoredNames(manifest);
  const expectedNames = manifest.skills.map((entry) => entry.name).sort();
  const actualNames = (
    await readdir(root, { withFileTypes: true }).catch((error) => {
      fail(`Third-party collection could not be read: ${error.message}`);
    })
  )
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    fail(
      `Generated snapshot directories must exactly match the manifest (expected ${expectedNames.join(
        ", ",
      )}; found ${actualNames.join(", ")}).`,
    );
  }

  for (const entry of manifest.skills) {
    await validateSnapshot(
      entry,
      lock.skills[entry.name],
      path.join(root, entry.name),
    );
  }
}

async function fetchSnapshot(entry, commit, destination, checkoutParent) {
  const checkout = path.join(checkoutParent, `${entry.name}-repo`);
  await mkdir(checkout, { recursive: true });
  await run("git", ["init", "--quiet", checkout]);
  await run("git", ["-C", checkout, "remote", "add", "origin", entry.repo]);
  await run("git", [
    "-C",
    checkout,
    "fetch",
    "--quiet",
    "--depth",
    "1",
    "origin",
    commit,
  ]);
  await run("git", [
    "-C",
    checkout,
    "checkout",
    "--quiet",
    "--detach",
    "FETCH_HEAD",
  ]);

  await copyTree(path.join(checkout, ...entry.path.split("/")), destination);
  const licenseSource = path.join(checkout, ...entry.license.file.split("/"));
  const licenseStat = await lstat(licenseSource).catch(() => null);
  if (!licenseStat?.isFile()) {
    fail(
      `${entry.name}: declared upstream license file is missing: ${entry.license.file}.`,
    );
  }
  await copyFile(licenseSource, path.join(destination, upstreamLicenseFile));
  await writeFile(
    path.join(destination, provenanceFile),
    provenance(entry, commit),
  );
}

async function stageCollection(manifest, commits, expectedLock) {
  const stageRoot = await mkdtemp(
    path.join(skillsRoot, ".third-party-essentials-stage-"),
  );
  const checkoutRoot = await mkdtemp(
    path.join(skillsRoot, ".third-party-essentials-fetch-"),
  );
  const nextLock = { version: 1, skills: {} };

  try {
    await copyFile(manifestPath, path.join(stageRoot, "sources.json"));
    for (const entry of manifest.skills) {
      const commit = commits[entry.name];
      const destination = path.join(stageRoot, entry.name);
      await fetchSnapshot(entry, commit, destination, checkoutRoot);
      const metadata = parseSkillFrontmatter(
        await readFile(path.join(destination, "SKILL.md"), "utf8").catch(() => ""),
      );
      if (!metadata.name) {
        fail(`${entry.name}: upstream SKILL.md is missing valid frontmatter.`);
      }
      if (metadata.name !== entry.name) {
        fail(
          `${entry.name}: upstream SKILL.md name is "${metadata.name}", expected "${entry.name}".`,
        );
      }
      const licenseContents = await readFile(
        path.join(destination, upstreamLicenseFile),
        "utf8",
      );
      if (licenseContents.trim().length === 0) {
        fail(`${entry.name}: declared upstream license file is empty.`);
      }
      nextLock.skills[entry.name] = {
        commit,
        hash: await hashDirectory(destination),
      };
      if (
        expectedLock &&
        nextLock.skills[entry.name].hash !== expectedLock.skills[entry.name].hash
      ) {
        fail(
          `${entry.name}: fetched locked commit does not reproduce the locked folder hash.`,
        );
      }
    }

    await writeFile(
      path.join(stageRoot, "sources.lock.json"),
      `${JSON.stringify(expectedLock ?? nextLock, null, 2)}\n`,
    );
    await validateCollection(manifest, expectedLock ?? nextLock, stageRoot);
    return { stageRoot, nextLock };
  } catch (error) {
    await rm(stageRoot, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(checkoutRoot, { recursive: true, force: true });
  }
}

async function installStagedCollection(stageRoot) {
  let marketplaceContents;
  try {
    marketplaceContents = await renderMarketplace(repoRoot, {
      directoryOverrides: { [collectionName]: stageRoot },
    });
  } catch (error) {
    await rm(stageRoot, { recursive: true, force: true });
    throw error;
  }
  const marketplaceTemporary = path.join(
    path.dirname(marketplacePath),
    `.marketplace.${process.pid}.${Date.now()}.tmp`,
  );
  const backupRoot = path.join(
    skillsRoot,
    `.third-party-essentials-backup-${process.pid}-${Date.now()}`,
  );
  await writeFile(marketplaceTemporary, marketplaceContents);

  let movedOriginal = false;
  let installedStage = false;
  try {
    try {
      await rename(collectionRoot, backupRoot);
      movedOriginal = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await rename(stageRoot, collectionRoot);
    installedStage = true;
    await rename(marketplaceTemporary, marketplacePath);
  } catch (error) {
    if (installedStage) {
      await rm(collectionRoot, { recursive: true, force: true });
    } else {
      await rm(stageRoot, { recursive: true, force: true });
    }
    if (movedOriginal) {
      await rename(backupRoot, collectionRoot);
    }
    await rm(marketplaceTemporary, { force: true });
    throw error;
  }

  if (movedOriginal) {
    try {
      await rm(backupRoot, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `Warning: installed the new collection and catalog, but could not remove backup ${backupRoot}: ${error.message}`,
      );
    }
  }
}

async function check() {
  const manifest = validateManifest(await readJson(manifestPath, "sources.json"));
  const lock = validateLock(
    await readJson(lockPath, "sources.lock.json"),
    manifest,
  );
  await validateCollection(manifest, lock);
  const expectedMarketplace = await renderMarketplace(repoRoot);
  const currentMarketplace = await readFile(marketplacePath, "utf8").catch(
    () => "",
  );
  if (currentMarketplace !== expectedMarketplace) {
    fail("Marketplace catalog is out of date. Run: bun run catalog:sync");
  }
  console.log("Third-party essentials are valid and up to date.");
}

async function sync() {
  const manifest = validateManifest(await readJson(manifestPath, "sources.json"));
  const lock = validateLock(
    await readJson(lockPath, "sources.lock.json"),
    manifest,
  );
  await assertNoDuplicateAuthoredNames(manifest);
  const commits = Object.fromEntries(
    Object.entries(lock.skills).map(([name, entry]) => [name, entry.commit]),
  );
  const { stageRoot } = await stageCollection(manifest, commits, lock);
  await installStagedCollection(stageRoot);
  console.log("Reproduced third-party essentials from sources.lock.json.");
}

async function resolveHead(entry) {
  const { stdout } = await run("git", [
    "ls-remote",
    "--exit-code",
    entry.repo,
    `refs/heads/${entry.ref}`,
  ]);
  const commit = stdout.trim().split(/\s+/)[0];
  if (!commitPattern.test(commit)) {
    fail(`${entry.name}: could not resolve branch ${entry.ref}.`);
  }
  return commit;
}

async function confirmUpdate(lines) {
  console.log("Third-party update preview:");
  for (const line of lines) console.log(`  ${line}`);
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question("Apply this update? [y/N] ");
    return /^(?:y|yes)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

async function update(args) {
  const assumeYes = args.includes("--yes");
  const requested = args.filter((argument) => argument !== "--yes");
  const manifest = validateManifest(await readJson(manifestPath, "sources.json"));
  const lock = validateUpdateLock(
    await readJson(lockPath, "sources.lock.json"),
    manifest,
  );
  await assertNoDuplicateAuthoredNames(manifest);
  if (new Set(requested).size !== requested.length) {
    fail("Each selected skill may be named only once.");
  }
  const knownNames = new Set(manifest.skills.map((entry) => entry.name));
  for (const name of requested) {
    if (!knownNames.has(name)) fail(`Unknown third-party skill: ${name}.`);
  }

  const selected = new Set(
    requested.length > 0 ? requested : manifest.skills.map((entry) => entry.name),
  );
  const unlockedNames = manifest.skills
    .map((entry) => entry.name)
    .filter((name) => !lock.skills[name]);
  for (const name of unlockedNames) {
    if (!selected.has(name)) {
      fail(
        `${name}: new manifest entry must be included in the selected update.`,
      );
    }
  }
  const commits = Object.fromEntries(
    Object.entries(lock.skills).map(([name, entry]) => [name, entry.commit]),
  );
  const preview = [];
  for (const entry of manifest.skills) {
    if (!selected.has(entry.name)) continue;
    const nextCommit = await resolveHead(entry);
    commits[entry.name] = nextCommit;
    const previousCommit = lock.skills[entry.name]?.commit;
    preview.push(
      `${entry.name}: ${
        previousCommit ? previousCommit.slice(0, 12) : "(new)"
      } -> ${nextCommit.slice(0, 12)} (${entry.ref})`,
    );
  }

  if (!assumeYes && !(await confirmUpdate(preview))) {
    console.log("Update cancelled; no files were changed.");
    return;
  }
  if (assumeYes) {
    console.log("Third-party update preview:");
    for (const line of preview) console.log(`  ${line}`);
  }

  const { stageRoot, nextLock } = await stageCollection(
    manifest,
    commits,
    null,
  );
  await writeFile(
    path.join(stageRoot, "sources.lock.json"),
    `${JSON.stringify(nextLock, null, 2)}\n`,
  );
  await validateCollection(manifest, nextLock, stageRoot);
  await installStagedCollection(stageRoot);
  console.log(
    `Updated ${[...selected].sort().join(", ")} and refreshed generated snapshots.`,
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "check") return check();
  if (command === "sync") return sync();
  if (command === "update") return update(args);
  fail(
    "Usage: node scripts/third-party-essentials.mjs <check|sync|update> [skill...] [--yes]",
  );
}

await main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
