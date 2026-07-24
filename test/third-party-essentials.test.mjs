import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));

function run(command, args, cwd, { input } = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    input,
  });
}

function output(result) {
  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

function assertSucceeded(result, command) {
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    `${command} failed with status ${result.status}:\n${output(result)}`,
  );
}

async function writeSkill(
  repository,
  skillPath,
  name,
  supportingFiles = {},
) {
  const directory = path.join(repository, ...skillPath.split("/"));
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "SKILL.md"),
    `---\nname: ${name}\ndescription: Fixture ${name}.\n---\n\n# ${name}\n`,
  );
  for (const [relativePath, contents] of Object.entries(supportingFiles)) {
    const target = path.join(directory, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
}

function git(repository, args) {
  const result = run("git", args, repository);
  assertSucceeded(result, `git ${args.join(" ")}`);
  return result.stdout.trim();
}

async function createUpstream(root, name, skillPath, supportingFiles = {}) {
  const repository = path.join(root, `${name}-upstream`);
  await mkdir(repository, { recursive: true });
  git(repository, ["init", "--quiet", "--initial-branch=main"]);
  git(repository, ["config", "user.name", "Fixture"]);
  git(repository, ["config", "user.email", "fixture@example.com"]);
  await writeFile(
    path.join(repository, "LICENSE"),
    `MIT License\n\nCopyright fixture ${name}\n`,
  );
  await writeSkill(repository, skillPath, name, supportingFiles);
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", "initial"]);
  return repository;
}

async function commitUpstream(
  repository,
  skillPath,
  name,
  supportingFiles = {},
) {
  await writeSkill(repository, skillPath, name, supportingFiles);
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", `update ${name}`]);
  return git(repository, ["rev-parse", "HEAD"]);
}

async function createFixture(t) {
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), "third-party-essentials-"),
  );
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  await mkdir(path.join(fixtureRoot, "scripts"), { recursive: true });
  await mkdir(path.join(fixtureRoot, ".claude-plugin"), { recursive: true });
  await mkdir(path.join(fixtureRoot, "skills", "essentials"), {
    recursive: true,
  });
  await mkdir(
    path.join(fixtureRoot, "skills", "third-party-essentials"),
    { recursive: true },
  );
  for (const file of ["sync-catalog.mjs", "third-party-essentials.mjs"]) {
    await copyFile(
      path.join(sourceRoot, "scripts", file),
      path.join(fixtureRoot, "scripts", file),
    );
  }
  await copyFile(
    path.join(sourceRoot, "package.json"),
    path.join(fixtureRoot, "package.json"),
  );
  await addAuthoredSkill(fixtureRoot, "authored-skill");

  const alphaPath = "skills/alpha";
  const betaPath = "skills/productivity/beta";
  const alphaRepository = await createUpstream(
    fixtureRoot,
    "alpha",
    alphaPath,
    { "references/guide.md": "alpha guide v1\n" },
  );
  const betaRepository = await createUpstream(
    fixtureRoot,
    "beta",
    betaPath,
    { "agents/openai.yaml": "interface:\n  display_name: Beta\n" },
  );
  const alphaCommit = git(alphaRepository, ["rev-parse", "HEAD"]);
  const betaCommit = git(betaRepository, ["rev-parse", "HEAD"]);
  const manifest = {
    version: 1,
    skills: [
      {
        name: "alpha",
        repo: alphaRepository,
        path: alphaPath,
        ref: "main",
        author: "Alpha Author",
        homepage: "https://example.com/alpha",
        license: { spdx: "MIT", file: "LICENSE" },
      },
      {
        name: "beta",
        repo: betaRepository,
        path: betaPath,
        ref: "main",
        author: "Beta Author",
        homepage: "https://example.com/beta",
        license: { spdx: "MIT", file: "LICENSE" },
      },
    ],
  };
  const placeholderHash = "0".repeat(64);
  const lock = {
    version: 1,
    skills: {
      alpha: { commit: alphaCommit, hash: placeholderHash },
      beta: { commit: betaCommit, hash: placeholderHash },
    },
  };
  await writeFile(
    path.join(
      fixtureRoot,
      "skills",
      "third-party-essentials",
      "sources.json",
    ),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(
    path.join(
      fixtureRoot,
      "skills",
      "third-party-essentials",
      "sources.lock.json",
    ),
    `${JSON.stringify(lock, null, 2)}\n`,
  );

  return {
    fixtureRoot,
    alphaPath,
    betaPath,
    alphaRepository,
    betaRepository,
  };
}

async function addAuthoredSkill(repoRoot, name) {
  const directory = path.join(repoRoot, "skills", "essentials", name);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "SKILL.md"),
    `---\nname: ${name}\ndescription: Authored fixture.\n---\n`,
  );
}

test("update, selective update, confirmation, locked sync, and check are deterministic", async (t) => {
  const fixture = await createFixture(t);
  const { fixtureRoot } = fixture;
  const initialUpdate = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixtureRoot,
  );
  assertSucceeded(initialUpdate, "bun run third-party:update --yes");

  const collectionRoot = path.join(
    fixtureRoot,
    "skills",
    "third-party-essentials",
  );
  const marketplacePath = path.join(
    fixtureRoot,
    ".claude-plugin",
    "marketplace.json",
  );
  const initialLock = JSON.parse(
    await readFile(path.join(collectionRoot, "sources.lock.json"), "utf8"),
  );
  assert.notEqual(initialLock.skills.alpha.hash, "0".repeat(64));
  assert.notEqual(initialLock.skills.beta.hash, "0".repeat(64));
  assert.equal(
    await readFile(
      path.join(collectionRoot, "alpha", "references", "guide.md"),
      "utf8",
    ),
    "alpha guide v1\n",
  );
  assert.match(
    await readFile(path.join(collectionRoot, "alpha", "UPSTREAM.md"), "utf8"),
    new RegExp(initialLock.skills.alpha.commit),
  );
  assert.match(
    await readFile(
      path.join(collectionRoot, "alpha", "LICENSE.upstream"),
      "utf8",
    ),
    /MIT License/,
  );
  assert.equal(
    await readFile(
      path.join(collectionRoot, "beta", "agents", "openai.yaml"),
      "utf8",
    ),
    "interface:\n  display_name: Beta\n",
  );
  const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
  assert.deepEqual(
    marketplace.plugins.map((plugin) => plugin.name),
    ["essentials", "third-party-essentials"],
  );
  assert.deepEqual(marketplace.plugins[1].skills, [
    "./skills/third-party-essentials/alpha",
    "./skills/third-party-essentials/beta",
  ]);

  const currentCheck = run(
    "bun",
    ["run", "third-party:check"],
    fixtureRoot,
  );
  assertSucceeded(currentCheck, "bun run third-party:check");

  const cancelledCollection = await readFile(
    path.join(collectionRoot, "sources.lock.json"),
    "utf8",
  );
  await commitUpstream(fixture.alphaRepository, fixture.alphaPath, "alpha", {
    "references/guide.md": "alpha guide v2\n",
  });
  const cancelled = run(
    "bun",
    ["run", "third-party:update", "alpha"],
    fixtureRoot,
    { input: "n\n" },
  );
  assertSucceeded(cancelled, "cancelled third-party update");
  assert.match(output(cancelled), /Update cancelled; no files were changed/);
  assert.equal(
    await readFile(path.join(collectionRoot, "sources.lock.json"), "utf8"),
    cancelledCollection,
  );

  const betaBefore = initialLock.skills.beta;
  const selective = run(
    "bun",
    ["run", "third-party:update", "alpha", "--yes"],
    fixtureRoot,
  );
  assertSucceeded(selective, "selective third-party update");
  const selectiveLock = JSON.parse(
    await readFile(path.join(collectionRoot, "sources.lock.json"), "utf8"),
  );
  assert.notEqual(selectiveLock.skills.alpha.commit, initialLock.skills.alpha.commit);
  assert.deepEqual(selectiveLock.skills.beta, betaBefore);
  assert.equal(
    await readFile(
      path.join(collectionRoot, "alpha", "references", "guide.md"),
      "utf8",
    ),
    "alpha guide v2\n",
  );

  await writeFile(
    path.join(collectionRoot, "alpha", "references", "guide.md"),
    "local drift\n",
  );
  const drift = run("bun", ["run", "third-party:check"], fixtureRoot);
  assert.ifError(drift.error);
  assert.notEqual(drift.status, 0);
  assert.match(output(drift), /snapshot hash drift/);
  assert.equal(
    await readFile(
      path.join(collectionRoot, "alpha", "references", "guide.md"),
      "utf8",
    ),
    "local drift\n",
  );

  const lockedSync = run(
    "bun",
    ["run", "third-party:sync"],
    fixtureRoot,
  );
  assertSucceeded(lockedSync, "bun run third-party:sync");
  assert.equal(
    await readFile(
      path.join(collectionRoot, "alpha", "references", "guide.md"),
      "utf8",
    ),
    "alpha guide v2\n",
  );
  assert.deepEqual(
    JSON.parse(
      await readFile(path.join(collectionRoot, "sources.lock.json"), "utf8"),
    ),
    selectiveLock,
  );
});

test("an invalid upstream update leaves snapshots, lock, and catalog untouched", async (t) => {
  const fixture = await createFixture(t);
  const initialUpdate = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(initialUpdate, "initial third-party update");
  const collectionRoot = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
  );
  const lockPath = path.join(collectionRoot, "sources.lock.json");
  const catalogPath = path.join(
    fixture.fixtureRoot,
    ".claude-plugin",
    "marketplace.json",
  );
  const beforeLock = await readFile(lockPath, "utf8");
  const beforeCatalog = await readFile(catalogPath, "utf8");
  const beforeSkill = await readFile(
    path.join(collectionRoot, "alpha", "SKILL.md"),
    "utf8",
  );

  await writeSkill(
    fixture.alphaRepository,
    fixture.alphaPath,
    "wrong-name",
  );
  git(fixture.alphaRepository, ["add", "."]);
  git(fixture.alphaRepository, [
    "commit",
    "--quiet",
    "-m",
    "invalid frontmatter",
  ]);
  const invalid = run(
    "bun",
    ["run", "third-party:update", "alpha", "--yes"],
    fixture.fixtureRoot,
  );
  assert.ifError(invalid.error);
  assert.notEqual(invalid.status, 0);
  assert.match(output(invalid), /expected "alpha"/);
  assert.equal(await readFile(lockPath, "utf8"), beforeLock);
  assert.equal(await readFile(catalogPath, "utf8"), beforeCatalog);
  assert.equal(
    await readFile(path.join(collectionRoot, "alpha", "SKILL.md"), "utf8"),
    beforeSkill,
  );
});

test("a new manifest entry can be resolved and added selectively", async (t) => {
  const fixture = await createFixture(t);
  const initialUpdate = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(initialUpdate, "initial third-party update");
  const gammaPath = "skills/gamma";
  const gammaRepository = await createUpstream(
    fixture.fixtureRoot,
    "gamma",
    gammaPath,
    { "references/example.md": "gamma example\n" },
  );
  const collectionRoot = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
  );
  const manifestPath = path.join(collectionRoot, "sources.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.skills.push({
    name: "gamma",
    repo: gammaRepository,
    path: gammaPath,
    ref: "main",
    author: "Gamma Author",
    homepage: "https://example.com/gamma",
    license: { spdx: "MIT", file: "LICENSE" },
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const add = run(
    "bun",
    ["run", "third-party:update", "gamma", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(add, "selective third-party add");
  const lock = JSON.parse(
    await readFile(path.join(collectionRoot, "sources.lock.json"), "utf8"),
  );
  assert.match(lock.skills.gamma.commit, /^[0-9a-f]{40,64}$/);
  assert.match(lock.skills.gamma.hash, /^[0-9a-f]{64}$/);
  assert.equal(
    await readFile(
      path.join(collectionRoot, "gamma", "references", "example.md"),
      "utf8",
    ),
    "gamma example\n",
  );
});

test("check rejects unsafe paths without writing", async (t) => {
  const fixture = await createFixture(t);
  const manifestPath = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
    "sources.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.skills[0].path = "../alpha";
  const invalidContents = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(manifestPath, invalidContents);

  const result = run(
    "bun",
    ["run", "third-party:check"],
    fixture.fixtureRoot,
  );
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(output(result), /safe relative POSIX path/);
  assert.equal(await readFile(manifestPath, "utf8"), invalidContents);
});

test("check rejects missing license metadata without writing", async (t) => {
  const fixture = await createFixture(t);
  const manifestPath = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
    "sources.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  delete manifest.skills[0].license;
  const invalidContents = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(manifestPath, invalidContents);

  const result = run(
    "bun",
    ["run", "third-party:check"],
    fixture.fixtureRoot,
  );
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(output(result), /license\.spdx must be a valid SPDX identifier/);
  assert.equal(await readFile(manifestPath, "utf8"), invalidContents);
});

test("executable-bit drift fails check and locked sync restores it", async (t) => {
  const fixture = await createFixture(t);
  const initialUpdate = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(initialUpdate, "initial third-party update");

  const guidePath = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
    "alpha",
    "references",
    "guide.md",
  );
  assert.equal((await lstat(guidePath)).mode & 0o111, 0);
  await chmod(guidePath, 0o755);

  const drift = run(
    "bun",
    ["run", "third-party:check"],
    fixture.fixtureRoot,
  );
  assert.ifError(drift.error);
  assert.notEqual(drift.status, 0);
  assert.match(output(drift), /snapshot hash drift/);

  const lockedSync = run(
    "bun",
    ["run", "third-party:sync"],
    fixture.fixtureRoot,
  );
  assertSucceeded(lockedSync, "bun run third-party:sync");
  assert.equal((await lstat(guidePath)).mode & 0o111, 0);
});

test("mode framing distinguishes executable content from prefixed non-executable content", async (t) => {
  const fixture = await createFixture(t);
  await commitUpstream(
    fixture.alphaRepository,
    fixture.alphaPath,
    "alpha",
    {
      "references/guide.md": "git-executable\0payload\n",
    },
  );
  const initialUpdate = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(initialUpdate, "initial third-party update");

  const guidePath = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
    "alpha",
    "references",
    "guide.md",
  );
  await writeFile(guidePath, "payload\n");
  await chmod(guidePath, 0o755);

  const drift = run(
    "bun",
    ["run", "third-party:check"],
    fixture.fixtureRoot,
  );
  assert.ifError(drift.error);
  assert.notEqual(drift.status, 0);
  assert.match(output(drift), /snapshot hash drift/);
});

test("a non-MIT SPDX license can update and check", async (t) => {
  const fixture = await createFixture(t);
  const collectionRoot = path.join(
    fixture.fixtureRoot,
    "skills",
    "third-party-essentials",
  );
  const manifestPath = path.join(collectionRoot, "sources.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.skills[0].license.spdx, "MIT");
  manifest.skills[1].license.spdx = "Apache-2.0";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    path.join(fixture.betaRepository, "LICENSE"),
    "Apache License\nVersion 2.0, January 2004\n",
  );
  git(fixture.betaRepository, ["add", "LICENSE"]);
  git(fixture.betaRepository, ["commit", "--quiet", "-m", "use Apache-2.0"]);

  const update = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(update, "Apache-2.0 third-party update");
  assert.match(
    await readFile(path.join(collectionRoot, "beta", "UPSTREAM.md"), "utf8"),
    /License: Apache-2\.0/,
  );
  assert.match(
    await readFile(
      path.join(collectionRoot, "beta", "LICENSE.upstream"),
      "utf8",
    ),
    /Apache License/,
  );

  const check = run(
    "bun",
    ["run", "third-party:check"],
    fixture.fixtureRoot,
  );
  assertSucceeded(check, "Apache-2.0 third-party check");
});

test("backup cleanup failure keeps the committed collection and catalog consistent", async (t) => {
  const fixture = await createFixture(t);
  const initialUpdate = run(
    "bun",
    ["run", "third-party:update", "--yes"],
    fixture.fixtureRoot,
  );
  assertSucceeded(initialUpdate, "initial third-party update");

  const gammaPath = "skills/gamma";
  const gammaRepository = await createUpstream(
    fixture.fixtureRoot,
    "gamma",
    gammaPath,
  );
  const skillsRoot = path.join(fixture.fixtureRoot, "skills");
  const collectionRoot = path.join(skillsRoot, "third-party-essentials");
  const manifestPath = path.join(collectionRoot, "sources.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.skills.push({
    name: "gamma",
    repo: gammaRepository,
    path: gammaPath,
    ref: "main",
    author: "Gamma Author",
    homepage: "https://example.com/gamma",
    license: { spdx: "MIT", file: "LICENSE" },
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await chmod(collectionRoot, 0o555);

  let backups = [];
  try {
    const update = run(
      "bun",
      ["run", "third-party:update", "gamma", "--yes"],
      fixture.fixtureRoot,
    );
    assertSucceeded(update, "third-party update with backup cleanup failure");
    assert.match(output(update), /Warning:.*backup/);

    const check = run(
      "bun",
      ["run", "third-party:check"],
      fixture.fixtureRoot,
    );
    assertSucceeded(check, "third-party check after backup cleanup failure");

    const marketplace = JSON.parse(
      await readFile(
        path.join(fixture.fixtureRoot, ".claude-plugin", "marketplace.json"),
        "utf8",
      ),
    );
    assert.match(
      await readFile(path.join(collectionRoot, "gamma", "SKILL.md"), "utf8"),
      /name: gamma/,
    );
    assert.ok(
      marketplace.plugins
        .find((plugin) => plugin.name === "third-party-essentials")
        .skills.includes("./skills/third-party-essentials/gamma"),
    );

    backups = (await readdir(skillsRoot)).filter((name) =>
      name.startsWith(".third-party-essentials-backup-"),
    );
    assert.equal(backups.length, 1);
  } finally {
    await chmod(collectionRoot, 0o755).catch(() => {});
    for (const backup of backups) {
      await chmod(path.join(skillsRoot, backup), 0o755).catch(() => {});
    }
  }
});
