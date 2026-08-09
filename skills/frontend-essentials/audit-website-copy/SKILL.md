---
name: audit-website-copy
description: Audit website copy through an independent critic council and final arbiter, using compose-prose as the prose rubric. Use for read-only website copy reviews.
---

# Audit Website Copy

Convene a **council**: independent critics inspect the same copy through
non-overlapping lenses, then a fresh **arbiter** reconciles their evidence into
one recommendation. Keep the review read-only and label every suggestion as a
proposal.

## 1. Establish the score

1. Resolve and read the complete `compose-prose/SKILL.md`.
   - Prefer a path supplied by the user.
   - Otherwise locate an installed sibling skill named `compose-prose`.
   - If it is unavailable, pause and ask for its path or installation. Use the
     actual skill as the single source of truth for the cadence rubric.
2. Read the repository instructions, copy or locale sources, rendered section
   order, and any specification, brand, audience, or localization guidance that
   constrains the page.
3. Record the starting worktree state when the copy lives in a Git repository.
   Make no review-caused changes and track any concurrent drift.
4. Build a scope ledger with every in-scope route, section, locale, source file,
   metadata surface, and fixed requirement. Distinguish:
   - narrative prose eligible for the full cadence rubric;
   - interface fragments such as headings, labels, navigation, and calls to
     action;
   - SEO, schema, manifest, and social-preview copy;
   - third-party embeds and dynamic content; inspect their visible copy when
     access is available, otherwise record an explicit unresolved boundary;
   - unused or unreachable strings.
5. Define every quantitative denominator before counting. State sentence
   boundaries, word-count assumptions, exclusions, and the unit being scored.
   Use a range or a qualitative verdict when the source cannot support a
   reproducible percentage.

Completion criterion: every visible copy surface and locale is accounted for,
the eligible prose corpus is explicit, and the council can distinguish editorial
judgment from fixed product decisions.

## 2. Seat the council

Create five fresh, read-only critics. Run them concurrently when subagent tools
are available. Give every critic:

- the user's exact question;
- the scope ledger and fixed constraints;
- the resolved `compose-prose` path, with an instruction to read it completely
  before analysis;
- direct access to the current source;
- one lens below and no other critic's report.

Require current `file:line` evidence for repository copy, or stable page and
section identifiers for a live site. Each report must contain:

1. a direct verdict;
2. its scope, method, and any denominator;
3. the strongest evidence for and against the current copy;
4. ranked findings and recommendations;
5. uncertainties and proof obligations;
6. proposed lines clearly labeled as suggestions.

### Council seats

1. **Cadence critic**
   - Map every applicable `compose-prose` rule to
     `pass | partial | fail | not applicable`.
   - Measure sentence registers only across the declared prose corpus.
   - Separate formal silhouette compliance from the finished musical effect.
   - Identify paragraph arcs, landings, sharp contrasts, breathless clauses,
     mechanical transitions, and repeated shapes; explain each conspicuous
     sentence's rhetorical job.

2. **Voice and brand critic**
   - Find the site's native voice, borrowed language, tonal drift, naming
     patterns, and places where repeated branding clarifies or becomes
     wallpaper.
   - Judge whether rhythm reinforces the brand's meaning across sections.

3. **Reader-journey critic**
   - Trace promise, audience, proof, section hierarchy, transitions, calls to
     action, and the visitor's next useful action.
   - Treat specification-fixed sequence and actions as constraints, then improve
     the narrative around them.

4. **Proof and precision critic**
   - Test claims, numbers, maturity statements, specificity, factual parity,
     maintenance obligations, and alignment with the source specification.
   - Prefer honest limits and observable behavior over invented traction.

5. **Context critic**
   - For multilingual sites, audit semantic, tonal, structural, and cadence
     parity across locales while allowing natural composition in each language.
   - Otherwise audit consistency across routes, repeated components, interface
     fragments, and metadata; apply the long-form cadence rubric only to eligible
     prose.

If the user names a distinct lens that these seats do not cover, retask the
closest seat. Add one specialist only when the question is genuinely
independent and the five seats cannot own it without overlap.

Completion criterion: all seats return their required report, every ledger
surface has an owner, and reports remain independent. If subagents are
unavailable, perform the same five passes serially, sealing each report before
starting the next.

## 3. Appoint the arbiter

After the council finishes, re-read the current source and worktree state. If
the copy changed during the audit, identify the drift, refresh affected evidence
and denominators, and use one current snapshot for arbitration.

Create a fresh read-only arbiter. Give it the user request, scope ledger, fixed
constraints, current sources, `compose-prose`, and the complete text of every
critic report. Put the reports in its initial brief or deliver them directly
after spawning; successful delivery is a prerequisite for arbitration.

Instruct the arbiter to:

1. verify material claims against the current source;
2. reconcile conflicts by evidence and user intent;
3. reject recommendations that violate fixed facts, specifications, or page
   decisions;
4. distinguish formal cadence compliance from musical coherence;
5. merge duplicate findings and preserve material minority concerns;
6. classify each conclusion as confirmed, inferred, or unresolved;
7. prioritize the smallest changes with the greatest effect;
8. state what should remain unchanged.

Completion criterion: every material council finding is accepted, merged,
rejected with a reason, or marked unresolved, and the recommendation answers the
user's exact question.

## 4. Deliver the verdict

Return:

1. **Verdict** — the direct answer, including a defensible score or range only
   when its denominator is explicit.
2. **Scope and method** — what was reviewed, what was excluded, and how
   `compose-prose` was applied.
3. **Council** — one compact row per critic with its strongest finding.
4. **Final recommendation** — prioritized changes with grounded, non-binding
   copy directions where useful.
5. **Keep** — effective lines, structures, names, or constraints worth
   protecting.
6. **Unresolved** — uncertainties, unsupported claims, and maintenance or
   validation obligations.
7. **Read-only confirmation** — state that no files were edited and whether the
   scoped worktree diff remained unchanged. Attribute concurrent drift
   separately from council activity.

Finish when every in-scope surface appears in the ledger, every applicable
`compose-prose` rule has a disposition, every recommendation is evidence-backed
and constraint-safe, every council conflict is resolved or exposed, and the
review activity leaves no worktree diff.
