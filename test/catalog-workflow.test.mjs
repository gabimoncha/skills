import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function commandOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

function assertCommandSucceeded(result, command) {
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    `${command} failed with status ${result.status}:\n${commandOutput(result)}`,
  );
}

async function addSkill(
  repoRoot,
  collection,
  skillName,
  { frontmatter = "" } = {},
) {
  const skillDirectory = path.join(repoRoot, "skills", collection, skillName);
  await mkdir(skillDirectory, { recursive: true });

  await writeFile(
    path.join(skillDirectory, "SKILL.md"),
    `---\nname: ${skillName}\ndescription: A fixture skill for catalog workflow testing.\n${frontmatter}---\n\n# ${skillName}\n`,
  );
}

test("maintainer commands publish collection skills and detect catalog drift", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "skills-catalog-workflow-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await mkdir(path.join(fixtureRoot, "scripts"), { recursive: true });
  await mkdir(path.join(fixtureRoot, ".claude-plugin"), { recursive: true });
  await copyFile(
    path.join(sourceRoot, "scripts", "sync-catalog.mjs"),
    path.join(fixtureRoot, "scripts", "sync-catalog.mjs"),
  );
  await copyFile(
    path.join(sourceRoot, "package.json"),
    path.join(fixtureRoot, "package.json"),
  );

  // Create entries out of lexical order so deterministic sorting is observable.
  await addSkill(fixtureRoot, "everyday", "zebra-public");
  await addSkill(fixtureRoot, "everyday", "alpha-public");
  await addSkill(fixtureRoot, "personal", "personal-public");
  await addSkill(fixtureRoot, "personal", "block-internal", {
    frontmatter: "metadata:\n  internal: true\n",
  });
  await addSkill(fixtureRoot, "personal", "inline-internal", {
    frontmatter: "metadata: { internal: true }\n",
  });
  await addSkill(fixtureRoot, "personal", "unrelated-internal-setting", {
    frontmatter: "settings:\n  internal: true\n",
  });

  const firstSync = run("bun", ["run", "catalog:sync"], fixtureRoot);
  assertCommandSucceeded(firstSync, "bun run catalog:sync");

  const marketplacePath = path.join(
    fixtureRoot,
    ".claude-plugin",
    "marketplace.json",
  );
  const firstCatalog = await readFile(marketplacePath, "utf8");
  const marketplace = JSON.parse(firstCatalog);
  const skillsByCollection = new Map(
    marketplace.plugins.map((plugin) => [plugin.displayName, plugin.skills]),
  );

  assert.deepEqual(skillsByCollection.get("Everyday"), [
    "./skills/everyday/alpha-public",
    "./skills/everyday/zebra-public",
  ]);
  assert.deepEqual(skillsByCollection.get("Personal"), [
    "./skills/personal/personal-public",
    "./skills/personal/unrelated-internal-setting",
  ]);
  assert.doesNotMatch(firstCatalog, /(?:block|inline)-internal/);

  const secondSync = run("bun", ["run", "catalog:sync"], fixtureRoot);
  assertCommandSucceeded(secondSync, "bun run catalog:sync");
  assert.equal(await readFile(marketplacePath, "utf8"), firstCatalog);

  const currentCheck = run("bun", ["run", "catalog:check"], fixtureRoot);
  assertCommandSucceeded(currentCheck, "bun run catalog:check");

  const validation = run(
    "claude",
    ["plugin", "validate", marketplacePath],
    fixtureRoot,
  );
  assertCommandSucceeded(validation, "claude plugin validate");

  const staleMarketplace = JSON.parse(firstCatalog);
  const everyday = staleMarketplace.plugins.find(
    (plugin) => plugin.displayName === "Everyday",
  );
  everyday.skills.push("./skills/everyday/removed-skill");
  const staleCatalog = `${JSON.stringify(staleMarketplace, null, 2)}\n`;
  await writeFile(marketplacePath, staleCatalog);

  const staleCheck = run("bun", ["run", "catalog:check"], fixtureRoot);
  assert.ifError(staleCheck.error);
  assert.notEqual(staleCheck.status, 0);
  assert.match(commandOutput(staleCheck), /bun run catalog:sync/);
  assert.equal(await readFile(marketplacePath, "utf8"), staleCatalog);
});
