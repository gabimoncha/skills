#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants as fsConstants, rmSync } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { isIP } from "node:net";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const EXIT = Object.freeze({ OK: 0, CHECK_FAILURE: 1, USAGE: 2, ENVIRONMENT: 3 });
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MIN_FULL_RASTER_DPI = 120;
const MAX_FULL_RASTER_DPI = 600;
const MIN_SUSPECT_DPI = 180;
const MAX_CAPTURE_BYTES = 32 * 1024 * 1024;

class CliError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = EXIT.USAGE;
  }
}

class EnvironmentError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = EXIT.ENVIRONMENT;
  }
}

function diagnostic(message) {
  process.stderr.write(`inspect-pdf: ${message}\n`);
}

function usage() {
  diagnostic(
    [
      "usage: node inspect-pdf.mjs --pdf PATH --output DIR [options]",
      "  --expected-pages N",
      "  --expected-geometry WIDTHxHEIGHT    PDF points; applies to every page",
      "  --geometry-tolerance POINTS         default: 0.5",
      "  --expect-heading PAGE:LITERAL       repeatable",
      "  --suspect-pages LIST                e.g. 3,7-9",
      "  --strict-sharing",
      "  --json-stdout",
    ].join("\n"),
  );
}

function parsePositiveInteger(raw, option) {
  if (!/^[1-9]\d*$/.test(raw)) throw new CliError(`${option} must be a positive integer`);
  return Number(raw);
}

function parseNonnegativeNumber(raw, option) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new CliError(`${option} must be a nonnegative number`);
  }
  return value;
}

function requireValue(argv, index, option) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new CliError(`${option} requires a value`);
  }
  return value;
}

function parseArguments(argv) {
  for (const value of argv) {
    if (CONTROL_CHARACTERS.test(value)) {
      throw new CliError("arguments must not contain control characters");
    }
  }

  const options = {
    headings: [],
    suspectSpecs: [],
    strictSharing: false,
    jsonStdout: false,
    geometryTolerance: 0.5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--help") return { help: true };
    if (option === "--strict-sharing") {
      options.strictSharing = true;
      continue;
    }
    if (option === "--json-stdout") {
      options.jsonStdout = true;
      continue;
    }

    const value = requireValue(argv, index, option);
    index += 1;
    if (option === "--pdf") options.pdf = value;
    else if (option === "--output") options.output = value;
    else if (option === "--expected-pages") {
      options.expectedPages = parsePositiveInteger(value, option);
    } else if (option === "--expected-geometry") {
      const match = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i.exec(value);
      if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) {
        throw new CliError(`${option} must use positive WIDTHxHEIGHT values`);
      }
      options.expectedGeometry = { width: Number(match[1]), height: Number(match[2]) };
    } else if (option === "--geometry-tolerance") {
      options.geometryTolerance = parseNonnegativeNumber(value, option);
    } else if (option === "--expect-heading") {
      const separator = value.indexOf(":");
      if (separator < 1 || separator === value.length - 1) {
        throw new CliError(`${option} must use PAGE:LITERAL`);
      }
      options.headings.push({
        page: parsePositiveInteger(value.slice(0, separator), option),
        literal: value.slice(separator + 1),
      });
    } else if (option === "--suspect-pages") options.suspectSpecs.push(value);
    else throw new CliError(`unknown option: ${option}`);
  }

  if (!options.pdf || !options.output) {
    throw new CliError("--pdf and --output are required");
  }
  return options;
}

async function exists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function rootDepth(target) {
  const root = path.parse(target).root;
  return path.relative(root, target).split(path.sep).filter(Boolean).length;
}

async function resolveSafePaths(pdfArgument, outputArgument) {
  const pdfPath = path.resolve(pdfArgument);
  const outputPath = path.resolve(outputArgument);
  let inputStat;
  try {
    inputStat = await stat(pdfPath);
  } catch (error) {
    throw new CliError(`input PDF is not readable: ${error.message}`);
  }
  if (!inputStat.isFile()) throw new CliError("input PDF must be a regular file");

  const canonicalPdf = await realpath(pdfPath);
  const forbidden = new Set([
    path.parse(outputPath).root,
    path.resolve(homedir()),
    path.resolve(tmpdir()),
    path.resolve("/tmp"),
    path.resolve("/private/tmp"),
    path.resolve(process.cwd()),
  ]);
  if (forbidden.has(outputPath) || rootDepth(outputPath) < 3) {
    throw new CliError("refusing broad or root-like output directory");
  }

  let canonicalOutput;
  if (await exists(outputPath)) {
    const outputStat = await lstat(outputPath);
    if (outputStat.isSymbolicLink()) throw new CliError("output directory must not be a symlink");
    if (!outputStat.isDirectory()) throw new CliError("output path must be a directory");
    if ((await readdir(outputPath)).length > 0) {
      throw new CliError("output directory must be empty");
    }
    canonicalOutput = await realpath(outputPath);
  } else {
    const parent = path.dirname(outputPath);
    let parentStat;
    try {
      parentStat = await stat(parent);
    } catch (error) {
      throw new CliError(`output parent must already exist: ${error.message}`);
    }
    if (!parentStat.isDirectory()) throw new CliError("output parent must be a directory");
    canonicalOutput = path.join(await realpath(parent), path.basename(outputPath));
  }

  if (canonicalOutput === canonicalPdf) throw new CliError("input PDF cannot be the output path");
  const relativeInput = path.relative(canonicalOutput, canonicalPdf);
  if (relativeInput === "" || (!relativeInput.startsWith("..") && !path.isAbsolute(relativeInput))) {
    throw new CliError("output directory must not contain the input PDF");
  }
  return { pdfPath: canonicalPdf, outputPath: canonicalOutput };
}

async function findExecutable(command) {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, command);
    try {
      await access(candidate, fsConstants.X_OK);
      const candidateStat = await stat(candidate);
      if (candidateStat.isFile()) return candidate;
    } catch {
      // Try the next PATH entry.
    }
  }
  return null;
}

async function discoverPrerequisites() {
  const commands = {};
  for (const command of ["pdfinfo", "pdftotext", "pdffonts", "pdftoppm", "magick"]) {
    const executable = await findExecutable(command);
    if (!executable) throw new EnvironmentError(`missing prerequisite on PATH: ${command}`);
    commands[command] = executable;
  }
  commands.node = process.execPath;
  return commands;
}

let activeChild = null;

function runCommand(executable, args, { env, timings, label }) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(executable, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    activeChild = child;
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let overflow = false;

    const collect = (chunks, field) => (chunk) => {
      if (field === "stdout") stdoutBytes += chunk.length;
      else stderrBytes += chunk.length;
      if (stdoutBytes + stderrBytes > MAX_CAPTURE_BYTES) {
        overflow = true;
        child.kill("SIGKILL");
        return;
      }
      chunks.push(chunk);
    };
    child.stdout.on("data", collect(stdout, "stdout"));
    child.stderr.on("data", collect(stderr, "stderr"));
    child.on("error", (error) => {
      activeChild = null;
      reject(new EnvironmentError(`could not execute ${label}: ${error.message}`));
    });
    child.on("close", (code, signal) => {
      activeChild = null;
      const durationMs = Math.round((performance.now() - started) * 10) / 10;
      timings.push({ command: label, duration_ms: durationMs, exit_code: code, signal });
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (overflow) {
        reject(new EnvironmentError(`${label} exceeded the ${MAX_CAPTURE_BYTES}-byte output limit`));
      } else if (code !== 0) {
        const detail = result.stderr.trim().slice(0, 600) || `exit ${code ?? signal}`;
        reject(new EnvironmentError(`${label} failed: ${detail}`));
      } else resolve(result);
    });
  });
}

function parsePageCount(pdfinfoOutput) {
  const match = /^Pages:\s+(\d+)\s*$/m.exec(pdfinfoOutput);
  if (!match || Number(match[1]) < 1) throw new EnvironmentError("pdfinfo returned no valid page count");
  return Number(match[1]);
}

function parseGeometry(pdfinfoOutput, pageCount) {
  const byPage = new Map();
  for (const match of pdfinfoOutput.matchAll(
    /^Page\s+(\d+)\s+size:\s+(\d+(?:\.\d+)?)\s+x\s+(\d+(?:\.\d+)?)\s+pts(?:\s+\([^()\r\n]+\))*\s*$/gm,
  )) {
    const page = Number(match[1]);
    const width = Number(match[2]);
    const height = Number(match[3]);
    if (
      page < 1 ||
      page > pageCount ||
      byPage.has(page) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new EnvironmentError(`pdfinfo returned invalid or duplicate geometry for page ${page}`);
    }
    byPage.set(page, { width_points: width, height_points: height });
  }
  if (
    byPage.size !== pageCount ||
    Array.from({ length: pageCount }, (_, index) => index + 1).some((page) => !byPage.has(page))
  ) {
    throw new EnvironmentError(`pdfinfo returned geometry for ${byPage.size}/${pageCount} pages`);
  }
  return Array.from({ length: pageCount }, (_, index) => ({ page: index + 1, ...byPage.get(index + 1) }));
}

function collectBoundingBoxWarnings(output, warnings, source) {
  for (const line of output.split(/\r?\n/)) {
    if (/\b(?:bbox|bounding[\s-]*box)\b/i.test(line)) {
      warnings.push({ code: "bounding-box-diagnostic", source, message: line.trim().slice(0, 500) });
    }
  }
}

function inspectPageBoxes(output, warnings) {
  const boxes = new Map();
  for (const match of output.matchAll(
    /^Page\s+(\d+)\s+(MediaBox|CropBox):\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*$/gm,
  )) {
    const page = Number(match[1]);
    const pageBoxes = boxes.get(page) ?? {};
    pageBoxes[match[2]] = match.slice(3).map(Number);
    boxes.set(page, pageBoxes);
  }
  for (const [page, pageBoxes] of boxes) {
    for (const [name, values] of Object.entries(pageBoxes)) {
      if (values[2] <= values[0] || values[3] <= values[1]) {
        warnings.push({ code: "invalid-page-box", page, box: name, values });
      }
    }
    const media = pageBoxes.MediaBox;
    const crop = pageBoxes.CropBox;
    if (
      media &&
      crop &&
      (crop[0] < media[0] - 0.01 ||
        crop[1] < media[1] - 0.01 ||
        crop[2] > media[2] + 0.01 ||
        crop[3] > media[3] + 0.01)
    ) {
      warnings.push({ code: "crop-box-outside-media-box", page, media_box: media, crop_box: crop });
    }
  }
}

function parseFontInventory(output, warnings) {
  const fonts = [];
  const unparsedRows = [];
  const lines = output.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed && !/^name\s+type\s+/i.test(trimmed) && !/^-+(?:\s+-+)+$/.test(trimmed);
  });
  const rowPattern =
    /^(.*?)\s+(Type 1(?:C)?(?: \(OT\))?|Type 3|TrueType(?: \(OT\))?|CID Type 0(?:C)?(?: \(OT\))?|CID TrueType(?: \(OT\))?)\s+(\S+)\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+(\d+)\s+(\d+)\s*$/;
  for (const line of lines) {
    const match = rowPattern.exec(line);
    if (!match) {
      unparsedRows.push(line.slice(0, 500));
      warnings.push({ code: "unparsed-font-row", message: line.slice(0, 500) });
      continue;
    }
    fonts.push({
      name: match[1].trim(),
      type: match[2],
      encoding: match[3],
      embedded: match[4] === "yes",
      subset: match[5] === "yes",
      unicode: match[6] === "yes",
      object_id: `${match[7]} ${match[8]}`,
    });
  }
  return { fonts, unparsedRows };
}

function parseUriInventory(output) {
  const items = [];
  for (const line of output.split(/\r?\n/).slice(1)) {
    const match = /^\s*(\d+)\s+(\S+)\s+(.+?)\s*$/.exec(line);
    if (match) items.push({ page: Number(match[1]), type: match[2], uri: match[3] });
  }
  return items;
}

function localUriReason(uri) {
  if (/^(?:\/|[A-Za-z]:[\\/])/.test(uri)) return "absolute filesystem path";
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return null;
  }
  if (parsed.protocol === "file:") return "file URI";
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    return "loopback or local hostname";
  }
  if (isIP(hostname) === 6) {
    const hextets = expandIpv6(hostname);
    if (
      hextets &&
      (hextets.every((value) => value === 0) ||
        (hextets.slice(0, 7).every((value) => value === 0) && hextets[7] === 1) ||
        (hextets[0] & 0xffc0) === 0xfe80 ||
        (hextets[0] & 0xfe00) === 0xfc00)
    ) {
      return "loopback, unspecified, link-local, or unique-local IPv6 address";
    }
  }
  if (
    /^(?:127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.)/.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return "loopback, link-local, or private-network address";
  }
  return null;
}

function expandIpv6(hostname) {
  const halves = hostname.split("::");
  if (halves.length > 2) return null;
  const parseHalf = (half) =>
    half
      ? half.split(":").map((part) => {
          const value = Number.parseInt(part, 16);
          return Number.isInteger(value) && value >= 0 && value <= 0xffff ? value : null;
        })
      : [];
  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1] ?? "");
  if ([...left, ...right].some((value) => value === null)) return null;
  if (halves.length === 1) return left.length === 8 ? left : null;
  const omitted = 8 - left.length - right.length;
  if (omitted < 1) return null;
  return [...left, ...Array(omitted).fill(0), ...right];
}

function expandPageSpecs(specs, pageCount) {
  const pages = new Set();
  for (const spec of specs) {
    for (const token of spec.split(",")) {
      const match = /^(\d+)(?:-(\d+))?$/.exec(token.trim());
      if (!match) throw new CliError(`invalid suspect page token: ${token}`);
      const start = parsePositiveInteger(match[1], "--suspect-pages");
      const end = match[2] ? parsePositiveInteger(match[2], "--suspect-pages") : start;
      if (end < start) throw new CliError(`suspect page range must be ascending: ${token}`);
      if (end > pageCount) throw new CliError(`suspect page ${end} exceeds page count ${pageCount}`);
      for (let page = start; page <= end; page += 1) pages.add(page);
    }
  }
  return [...pages].sort((left, right) => left - right);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function chooseFullRasterDpi(geometry) {
  const required = geometry.reduce(
    (highest, page) =>
      Math.max(
        highest,
        (640 * 72) / page.width_points,
        (360 * 72) / page.height_points,
      ),
    MIN_FULL_RASTER_DPI,
  );
  return Math.min(MAX_FULL_RASTER_DPI, Math.ceil(required));
}

function deduplicateWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = JSON.stringify(warning);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function artifactPath(outputPath, name) {
  return path.join(outputPath, name);
}

function addCheck(report, id, status, details = {}) {
  report.checks.push({ id, status, ...details });
  if (status === "fail") report.failures.push({ code: id, ...details });
}

async function inspect(options, paths, commands) {
  const timings = [];
  const warnings = [];
  const failures = [];
  const checks = [];
  const artifacts = [];
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "prepare-pdf-delivery-"));
  await chmod(temporaryDirectory, 0o700);
  const cacheDirectory = path.join(temporaryDirectory, "cache");
  await mkdir(cacheDirectory, { mode: 0o700 });
  const commandEnvironment = { ...process.env, XDG_CACHE_HOME: cacheDirectory };
  const signalHandler = (signal) => {
    if (activeChild) activeChild.kill(signal);
    rmSync(temporaryDirectory, { recursive: true, force: true });
    diagnostic(`interrupted by ${signal}; temporary state removed`);
    process.exit(EXIT.ENVIRONMENT);
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, signalHandler);

  try {
    await mkdir(paths.outputPath, { recursive: false, mode: 0o700 }).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });

    const pdfBuffer = await readFile(paths.pdfPath);
    const snapshotPath = path.join(temporaryDirectory, "input.pdf");
    await writeFile(snapshotPath, pdfBuffer, { mode: 0o600 });
    const snapshotSha256 = sha256(pdfBuffer);
    const metadataResult = await runCommand(commands.pdfinfo, [snapshotPath], {
      env: commandEnvironment,
      timings,
      label: "pdfinfo-metadata",
    });
    collectBoundingBoxWarnings(metadataResult.stderr, warnings, "pdfinfo-metadata");
    const pageCount = parsePageCount(metadataResult.stdout);
    const geometryResult = await runCommand(
      commands.pdfinfo,
      ["-f", "1", "-l", String(pageCount), "-box", snapshotPath],
      { env: commandEnvironment, timings, label: "pdfinfo-geometry" },
    );
    collectBoundingBoxWarnings(geometryResult.stderr, warnings, "pdfinfo-geometry");
    inspectPageBoxes(geometryResult.stdout, warnings);
    const geometry = parseGeometry(geometryResult.stdout, pageCount);
    const fullRasterDpi = chooseFullRasterDpi(geometry);
    const suspectDpi = Math.max(MIN_SUSPECT_DPI, fullRasterDpi);

    const report = {
      schema_version: 1,
      input: {
        path: paths.pdfPath,
        sha256: snapshotSha256,
        snapshot_sha256: snapshotSha256,
        page_count: pageCount,
        geometry,
      },
      options: {
        expected_pages: options.expectedPages ?? null,
        expected_geometry: options.expectedGeometry ?? null,
        geometry_tolerance_points: options.geometryTolerance,
        expected_headings: options.headings,
        strict_sharing: options.strictSharing,
        suspect_pages: [],
      },
      raster: {
        full_document_passes: 1,
        full_document_dpi: fullRasterDpi,
        suspect_page_dpi: suspectDpi,
      },
      prerequisites: commands,
      timings,
      checks,
      warnings,
      failures,
      pages: [],
      links: {
        coverage:
          "URI annotations reported by pdfinfo -url only; internal PDF destinations and destination reachability are not checked.",
        items: [],
      },
      fonts: [],
      artifacts,
      deterministic_checks_passed: false,
      visual_quality_verified: false,
    };

    addCheck(report, "page-count", options.expectedPages === undefined || pageCount === options.expectedPages ? "pass" : "fail", {
      actual: pageCount,
      expected: options.expectedPages ?? null,
    });

    if (options.expectedGeometry) {
      const mismatches = geometry.filter(
        ({ width_points: width, height_points: height }) =>
          Math.abs(width - options.expectedGeometry.width) > options.geometryTolerance ||
          Math.abs(height - options.expectedGeometry.height) > options.geometryTolerance,
      );
      addCheck(report, "page-geometry", mismatches.length === 0 ? "pass" : "fail", {
        expected: options.expectedGeometry,
        tolerance_points: options.geometryTolerance,
        mismatches,
      });
    } else addCheck(report, "page-geometry", "not-requested", { observed: geometry });

    for (const heading of options.headings) {
      if (heading.page > pageCount) {
        throw new CliError(`heading page ${heading.page} exceeds page count ${pageCount}`);
      }
    }
    const textByPage = new Map();
    for (let page = 1; page <= pageCount; page += 1) {
      const textResult = await runCommand(
        commands.pdftotext,
        ["-f", String(page), "-l", String(page), "-enc", "UTF-8", snapshotPath, "-"],
        { env: commandEnvironment, timings, label: `pdftotext-page-${page}` },
      );
      collectBoundingBoxWarnings(textResult.stderr, warnings, `pdftotext-page-${page}`);
      const normalized = textResult.stdout.replace(/\f/g, "").trim();
      textByPage.set(page, normalized);
      report.pages.push({
        page,
        text_characters: normalized.length,
        text_sha256: sha256(Buffer.from(normalized)),
        raster_width: null,
        raster_height: null,
        raster_standard_deviation: null,
        candidates: [],
      });
      if (normalized.length === 0) {
        report.pages.at(-1).candidates.push("no-text");
        warnings.push({ code: "no-text-candidate", page });
      }
    }
    for (const heading of options.headings) {
      const found = textByPage.get(heading.page).includes(heading.literal);
      addCheck(report, `literal-heading-page-${heading.page}`, found ? "pass" : "fail", {
        page: heading.page,
        literal: heading.literal,
      });
    }

    const uriResult = await runCommand(commands.pdfinfo, ["-url", snapshotPath], {
      env: commandEnvironment,
      timings,
      label: "pdfinfo-url",
    });
    collectBoundingBoxWarnings(uriResult.stderr, warnings, "pdfinfo-url");
    report.links.items = parseUriInventory(uriResult.stdout).map((item) => ({
      ...item,
      local_reason: localUriReason(item.uri),
    }));
    const localLinks = report.links.items.filter((item) => item.local_reason);
    if (localLinks.length > 0 && !options.strictSharing) {
      warnings.push({ code: "device-local-uri-candidate", items: localLinks });
    }
    addCheck(report, "strict-sharing", !options.strictSharing ? "not-requested" : localLinks.length === 0 ? "pass" : "fail", {
      local_items: localLinks,
    });

    const fontResult = await runCommand(commands.pdffonts, [snapshotPath], {
      env: commandEnvironment,
      timings,
      label: "pdffonts",
    });
    collectBoundingBoxWarnings(fontResult.stderr, warnings, "pdffonts");
    const fontInventory = parseFontInventory(fontResult.stdout, warnings);
    report.fonts = fontInventory.fonts;
    const unembedded = report.fonts.filter((font) => !font.embedded);
    const type3 = report.fonts.filter((font) => font.type === "Type 3");
    if (type3.length > 0) {
      warnings.push({
        code: "type-3-fonts-require-visual-review",
        count: type3.length,
        font_names: [...new Set(type3.map((font) => font.name))],
      });
    }
    addCheck(
      report,
      "embedded-fonts",
      unembedded.length === 0 && fontInventory.unparsedRows.length === 0 ? "pass" : "fail",
      {
        unembedded,
        unparsed_rows: fontInventory.unparsedRows,
      },
    );

    const rasterPrefix = path.join(temporaryDirectory, "page");
    const rasterResult = await runCommand(
      commands.pdftoppm,
      ["-png", "-r", String(fullRasterDpi), snapshotPath, rasterPrefix],
      { env: commandEnvironment, timings, label: "pdftoppm-full-raster" },
    );
    collectBoundingBoxWarnings(rasterResult.stderr, warnings, "pdftoppm-full-raster");
    const rasterFiles = (await readdir(temporaryDirectory))
      .map((name) => ({ name, match: /^page-(\d+)\.png$/.exec(name) }))
      .filter(({ match }) => match)
      .map(({ name, match }) => ({ page: Number(match[1]), path: path.join(temporaryDirectory, name) }))
      .sort((left, right) => left.page - right.page);
    if (
      rasterFiles.length !== pageCount ||
      rasterFiles.some(({ page }, index) => page !== index + 1)
    ) {
      throw new EnvironmentError(`pdftoppm produced ${rasterFiles.length}/${pageCount} ordered page rasters`);
    }

    const undersizedPages = [];
    for (const raster of rasterFiles) {
      const identifyResult = await runCommand(
        commands.magick,
        [
          raster.path,
          "-colorspace",
          "gray",
          "-format",
          "%w %h %[fx:standard_deviation]",
          "info:",
        ],
        { env: commandEnvironment, timings, label: `magick-measure-page-${raster.page}` },
      );
      collectBoundingBoxWarnings(identifyResult.stderr, warnings, `magick-measure-page-${raster.page}`);
      const match = /^(\d+)\s+(\d+)\s+([\d.eE+-]+)$/.exec(identifyResult.stdout.trim());
      if (!match) throw new EnvironmentError(`could not measure raster for page ${raster.page}`);
      const pageRecord = report.pages[raster.page - 1];
      pageRecord.raster_width = Number(match[1]);
      pageRecord.raster_height = Number(match[2]);
      pageRecord.raster_standard_deviation = Number(match[3]);
      if (pageRecord.raster_width < 640 || pageRecord.raster_height < 360) {
        undersizedPages.push({
          page: raster.page,
          width: pageRecord.raster_width,
          height: pageRecord.raster_height,
        });
      }
      if (pageRecord.raster_standard_deviation < 0.003) {
        pageRecord.candidates.push("near-uniform");
        warnings.push({
          code: "near-uniform-page-candidate",
          page: raster.page,
          standard_deviation: pageRecord.raster_standard_deviation,
        });
      }
    }
    addCheck(report, "readable-raster-dimensions", undersizedPages.length === 0 ? "pass" : "fail", {
      minimum_pixels_per_page: { width: 640, height: 360 },
      undersized_pages: undersizedPages,
    });

    const macroName = "macro-001.png";
    await runCommand(
      commands.magick,
      [
        "montage",
        ...rasterFiles.map((entry) => entry.path),
        "-thumbnail",
        "320x240",
        "-tile",
        "4x",
        "-geometry",
        "+8+8",
        artifactPath(paths.outputPath, macroName),
      ],
      { env: commandEnvironment, timings, label: "magick-macro-sheet" },
    );
    artifacts.push({
      kind: "macro",
      path: artifactPath(paths.outputPath, macroName),
      pages: rasterFiles.map(({ page }) => page),
      source_dpi: fullRasterDpi,
    });

    if (pageCount <= 4) {
      for (const raster of rasterFiles) {
        const name = `readable-p${String(raster.page).padStart(3, "0")}.png`;
        await copyFile(raster.path, artifactPath(paths.outputPath, name));
        artifacts.push({
          kind: "readable-page",
          path: artifactPath(paths.outputPath, name),
          pages: [raster.page],
          source_dpi: fullRasterDpi,
        });
      }
    } else {
      for (let offset = 0; offset < rasterFiles.length; offset += 4) {
        const group = rasterFiles.slice(offset, offset + 4);
        const name = `readable-${String(offset / 4 + 1).padStart(3, "0")}.png`;
        await runCommand(
          commands.magick,
          [
            "montage",
            ...group.map((entry) => entry.path),
            "-tile",
            "2x2",
            "-geometry",
            "+16+16",
            artifactPath(paths.outputPath, name),
          ],
          { env: commandEnvironment, timings, label: `magick-readable-sheet-${offset / 4 + 1}` },
        );
        artifacts.push({
          kind: "readable",
          path: artifactPath(paths.outputPath, name),
          pages: group.map(({ page }) => page),
          source_dpi: fullRasterDpi,
        });
      }
    }

    const suspectPages = expandPageSpecs(options.suspectSpecs, pageCount);
    report.options.suspect_pages = suspectPages;
    for (const page of suspectPages) {
      const baseName = `suspect-p${String(page).padStart(3, "0")}`;
      const temporaryBase = path.join(temporaryDirectory, baseName);
      const suspectResult = await runCommand(
        commands.pdftoppm,
        [
          "-png",
          "-r",
          String(suspectDpi),
          "-f",
          String(page),
          "-l",
          String(page),
          "-singlefile",
          snapshotPath,
          temporaryBase,
        ],
        { env: commandEnvironment, timings, label: `pdftoppm-suspect-page-${page}` },
      );
      collectBoundingBoxWarnings(suspectResult.stderr, warnings, `pdftoppm-suspect-page-${page}`);
      const name = `${baseName}.png`;
      await copyFile(`${temporaryBase}.png`, artifactPath(paths.outputPath, name));
      artifacts.push({
        kind: "suspect",
        path: artifactPath(paths.outputPath, name),
        pages: [page],
        source_dpi: suspectDpi,
      });
    }

    report.warnings = deduplicateWarnings(warnings);
    report.deterministic_checks_passed = failures.length === 0;
    const json = `${JSON.stringify(report)}\n`;
    const temporaryJson = artifactPath(paths.outputPath, `.inspection-${process.pid}.tmp`);
    await writeFile(temporaryJson, json, { mode: 0o600 });
    await rename(temporaryJson, artifactPath(paths.outputPath, "inspection.json"));
    artifacts.push({
      kind: "report",
      path: artifactPath(paths.outputPath, "inspection.json"),
      pages: [],
    });
    // Rewrite once so inspection.json contains its own final artifact membership.
    await writeFile(artifactPath(paths.outputPath, "inspection.json"), `${JSON.stringify(report)}\n`, {
      mode: 0o600,
    });
    if (options.jsonStdout) process.stdout.write(`${JSON.stringify(report)}\n`);
    return failures.length === 0 ? EXIT.OK : EXIT.CHECK_FAILURE;
  } finally {
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.off(signal, signalHandler);
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    if (options.help) {
      usage();
      return EXIT.OK;
    }
    const paths = await resolveSafePaths(options.pdf, options.output);
    const commands = await discoverPrerequisites();
    return await inspect(options, paths, commands);
  } catch (error) {
    diagnostic(error instanceof Error ? error.message : String(error));
    if (error instanceof CliError) usage();
    return error?.exitCode ?? EXIT.ENVIRONMENT;
  }
}

process.exitCode = await main();
