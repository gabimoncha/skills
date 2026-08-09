---
name: prepare-pdf-delivery
description: Prepare or inspect a PDF for external delivery with deterministic structural checks and explicitly evidenced visual review.
disable-model-invocation: true
metadata:
  internal: true
---

# Prepare PDF Delivery

Use this workflow only when explicitly invoked. Separate deterministic inspection from visual judgment: the helper never proves visual quality, and a successful exit is not delivery approval.

## Choose the input mode

### HTML source

1. Inspect intended geometry and print CSS before rendering. Check `@page`, print-qualified media rules, backgrounds and `print-color-adjust`, animations/transitions, page breaks, responsive rules, font availability, and local/device-only links.
2. Render with an already-installed Chrome CLI. Do not ask the helper to invoke Chrome or install prerequisites.
3. Inspect the resulting PDF with the helper and the visual workflow below.
4. Compare representative HTML and PDF pages: title, densest layout, smallest or muted text, last page, and every materially distinct or print-affected layout family. These sentinels supplement—not replace—exhaustive PDF coverage.

### Existing PDF

Preserve the PDF unchanged, skip Chrome, and inspect it directly. Mutate or reconstruct it only with separate authorization.

## Run deterministic inspection

Run:

```bash
node scripts/inspect-pdf.mjs \
  --pdf "/absolute/input.pdf" \
  --output "/absolute/fresh-output-directory" \
  [--expected-pages 15] \
  [--expected-geometry 1152x648] \
  [--geometry-tolerance 0.5] \
  [--expect-heading "1:Literal title"] \
  [--suspect-pages "3,7-9"] \
  [--strict-sharing] \
  [--json-stdout]
```

Repeat `--expect-heading PAGE:LITERAL` as needed. Geometry is width × height in PDF points and applies to every page. The helper snapshots the input once, reports that snapshot's SHA-256 with the original input path, and uses only the immutable snapshot for inspection. The full-document raster occurs once at 120 DPI or higher when small page geometry requires it; `--suspect-pages` creates separate individual images at 180 DPI or higher. `--strict-sharing` fails device-local URI annotations, including local IPv4 and IPv6 ranges. The helper writes `inspection.json`, a macro overview, one readable image per page for 1–4-page PDFs or readable sheets with exact page membership for longer PDFs, and requested suspect images. Exit codes are `0` checks passed, `1` delivery-check failure, `2` usage/unsafe target, and `3` prerequisite/PDF/environment failure.

Treat URI results as only the annotations reported by `pdfinfo -url`; they do not prove destination reachability or cover internal PDF destinations. Treat no-text and near-uniform results only as candidates for closer review. Type 3 fonts and bounding-box diagnostics are warnings; unembedded fonts fail.

## Prove visual coverage

- For 1–4 pages, open every retained `readable-pNNN.png` page image individually at readable scale.
- For 5–20 pages, inspect the macro overview, then every page in readable batches of at most four with at least 640×360 pixels per page.
- For 21–40 pages, use the same exhaustive macro-plus-readable coverage across additional sheets.
- Over 40 pages, remain exhaustive by default. Sample only with explicit authorization; report the selection rule and every included and omitted page, and label the result partial QA.
- Open dense, suspicious, low-contrast, clipped, or visually distinct pages individually at 144 DPI or higher.

The helper identifies candidates and produces evidence; a model or human must judge hierarchy, legibility, contrast, clipping, overlap, and visual correctness.

## Correct and report

Batch confirmed corrections before rerendering. For a routine PDF, target no more than two Chrome renders and two full raster passes, then repeat final exhaustive readable coverage. Five minutes and about 25 inference boundaries for a routine PDF up to 20 pages are advisory workflow targets, never helper failures.

Report the input SHA-256, deterministic checks and failures, exact artifact-to-page coverage, individually inspected pages, comparison sentinels, warnings, and uninspected gaps. Prefer calibrated language such as “no observed defects across pages 1–15 at the recorded coverage.” Do not claim “verified,” “pixel-perfect,” “all pages,” “full resolution,” or “no clipping” unless the recorded evidence literally supports it.
