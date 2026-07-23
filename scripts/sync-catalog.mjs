import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const checkOnly = process.argv.includes("--check");

const collections = [
  {
    name: "everyday",
    displayName: "Everyday",
    description: "Portable skills used across most projects.",
  },
  {
    name: "personal",
    displayName: "Personal",
    description: "Skills tailored to personal workflows and environments.",
  },
];

function isInternalSkill(contents) {
  const frontmatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return false;

  const lines = frontmatter[1].split(/\r?\n/);
  const metadataIndex = lines.findIndex((line) => /^metadata:\s*/.test(line));
  if (metadataIndex === -1) return false;

  const inlineValue = lines[metadataIndex].match(/^metadata:\s*(.*)$/)?.[1];
  if (inlineValue) {
    const inlineMap = inlineValue.match(/^\{([\s\S]*)\}$/)?.[1];
    return inlineMap
      ? /(?:^|,)\s*internal\s*:\s*true\s*(?:,|$)/.test(inlineMap)
      : false;
  }

  const metadataEntries = [];

  for (const line of lines.slice(metadataIndex + 1)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const indentation = line.match(/^[ \t]*/)[0].length;
    if (indentation === 0) break;

    metadataEntries.push({ indentation, value: line.trim() });
  }

  if (metadataEntries.length === 0) return false;

  const directIndentation = Math.min(
    ...metadataEntries.map((entry) => entry.indentation),
  );

  return metadataEntries.some(
    (entry) =>
      entry.indentation === directIndentation &&
      /^internal:\s*true\s*$/.test(entry.value),
  );
}

async function discoverCollectionSkills(collection) {
  const collectionDir = path.join(repoRoot, "skills", collection);
  const entries = await readdir(collectionDir, { withFileTypes: true });
  const discovered = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillFile = path.join(collectionDir, entry.name, "SKILL.md");

    try {
      await access(skillFile);
    } catch {
      continue;
    }

    const contents = await readFile(skillFile, "utf8");
    if (isInternalSkill(contents)) continue;

    discovered.push(`./skills/${collection}/${entry.name}`);
  }

  return discovered.sort();
}

const plugins = await Promise.all(
  collections.map(async (collection) => ({
    name: collection.name,
    displayName: collection.displayName,
    source: "./",
    description: collection.description,
    strict: false,
    skills: await discoverCollectionSkills(collection.name),
  })),
);

const marketplace = {
  name: "gabimoncha-skills",
  owner: {
    name: "gabimoncha",
  },
  description: "Gabimoncha's personal and everyday agent skills.",
  plugins,
};

const expected = `${JSON.stringify(marketplace, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(marketplacePath, "utf8").catch(() => "");

  if (current !== expected) {
    console.error("Marketplace catalog is out of date. Run: bun run catalog:sync");
    process.exitCode = 1;
  } else {
    console.log("Marketplace catalog is up to date.");
  }
} else {
  await writeFile(marketplacePath, expected);
  console.log("Updated .claude-plugin/marketplace.json");
}
