import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const collections = [
  {
    name: "essentials",
    displayName: "Essentials",
    description: "Cross-project skills recommended for global installation.",
  },
  {
    name: "third-party-essentials",
    displayName: "Third-Party Essentials",
    description:
      "Curated upstream skills recommended for global installation.",
  },
];

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function parseSkillFrontmatter(contents) {
  const frontmatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return {};

  const lines = frontmatter[1].split(/\r?\n/);
  const name = lines
    .find((line) => /^name:\s*/.test(line))
    ?.replace(/^name:\s*/, "")
    .trim()
    .replace(/^(['"])(.*)\1$/, "$2");
  const metadataIndex = lines.findIndex((line) => /^metadata:\s*/.test(line));
  if (metadataIndex === -1) return { name, internal: false };

  const inlineValue = lines[metadataIndex].match(/^metadata:\s*(.*)$/)?.[1];
  if (inlineValue) {
    const inlineMap = inlineValue.match(/^\{([\s\S]*)\}$/)?.[1];
    return {
      name,
      internal: inlineMap
        ? /(?:^|,)\s*internal\s*:\s*true\s*(?:,|$)/.test(inlineMap)
        : false,
    };
  }

  const metadataEntries = [];

  for (const line of lines.slice(metadataIndex + 1)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const indentation = line.match(/^[ \t]*/)[0].length;
    if (indentation === 0) break;

    metadataEntries.push({ indentation, value: line.trim() });
  }

  if (metadataEntries.length === 0) return { name, internal: false };

  const directIndentation = Math.min(
    ...metadataEntries.map((entry) => entry.indentation),
  );

  return {
    name,
    internal: metadataEntries.some(
      (entry) =>
        entry.indentation === directIndentation &&
        /^internal:\s*true\s*$/.test(entry.value),
    ),
  };
}

export async function discoverCollectionSkills(
  repoRoot,
  collection,
  { collectionDirectory } = {},
) {
  const collectionDir =
    collectionDirectory ?? path.join(repoRoot, "skills", collection);
  const entries = await readdir(collectionDir, { withFileTypes: true }).catch(
    (error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
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
    const metadata = parseSkillFrontmatter(contents);
    if (metadata.internal) continue;

    discovered.push({
      name: metadata.name ?? entry.name,
      path: `./skills/${collection}/${entry.name}`,
    });
  }

  return discovered.sort((left, right) => compareText(left.path, right.path));
}

export async function renderMarketplace(repoRoot, { directoryOverrides } = {}) {
  const discoveredCollections = await Promise.all(
    collections.map(async (collection) => ({
      collection,
      skills: await discoverCollectionSkills(repoRoot, collection.name, {
        collectionDirectory: directoryOverrides?.[collection.name],
      }),
    })),
  );
  const names = new Map();

  for (const { collection, skills } of discoveredCollections) {
    for (const skill of skills) {
      const previous = names.get(skill.name);
      if (previous) {
        throw new Error(
          `Duplicate skill name "${skill.name}" in ${previous} and ${collection.name}.`,
        );
      }
      names.set(skill.name, collection.name);
    }
  }

  const marketplace = {
    name: "gabimoncha-skills",
    owner: {
      name: "gabimoncha",
    },
    description:
      "Gabimoncha's authored and curated third-party essential agent skills.",
    plugins: discoveredCollections.map(({ collection, skills }) => ({
      name: collection.name,
      displayName: collection.displayName,
      source: "./",
      description: collection.description,
      strict: false,
      skills: skills.map((skill) => skill.path),
    })),
  };

  return `${JSON.stringify(marketplace, null, 2)}\n`;
}

async function main() {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const marketplacePath = path.join(
    repoRoot,
    ".claude-plugin",
    "marketplace.json",
  );
  const checkOnly = process.argv.includes("--check");
  const expected = await renderMarketplace(repoRoot);

  if (checkOnly) {
    const current = await readFile(marketplacePath, "utf8").catch(() => "");

    if (current !== expected) {
      console.error(
        "Marketplace catalog is out of date. Run: bun run catalog:sync",
      );
      process.exitCode = 1;
    } else {
      console.log("Marketplace catalog is up to date.");
    }
  } else {
    await writeFile(marketplacePath, expected);
    console.log("Updated .claude-plugin/marketplace.json");
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
