# Agent Skill Collection

This context describes the language used to curate and publish the repository owner's reusable agent skills without confusing Public Skills, internal work in progress, and Repository Tooling.

## Language

**Skill**:
A reusable set of instructions that extends a compatible agent with a specific capability or workflow.
_Avoid_: Prompt, command

**Collection**:
A named grouping of public skills with the same intended pattern of use. A skill belongs to one collection.
_Avoid_: Category, catalog

**Essentials**:
The authored Collection. It contains reusable skills maintained in this
repository that the owner wants available across projects and recommends
installing globally.
_Avoid_: Everyday, Personal, Global

**Third-Party Essentials**:
The Collection of selected upstream skills that the owner recommends installing
globally. Its skill directories are generated snapshots governed by the source
manifest and resolved lock, not authored content.
_Avoid_: Essentials, vendored authored skills

**Upstream Skill**:
A skill maintained in another repository and selected for Third-Party
Essentials through the structured source manifest.
_Avoid_: Authored skill, dependency

**Generated Snapshot**:
The complete, pinned copy of an Upstream Skill plus repository-owned provenance
and upstream-license attribution. Its deterministic folder hash is recorded in
the generated lock and it must not be hand-edited.
_Avoid_: Fork, authored skill

**Public Skill**:
A mature skill exposed through normal Skills CLI discovery as part of a collection.
_Avoid_: Published package

**Internal Skill**:
A work-in-progress skill kept out of normal public discovery. Internal status is
independent of its membership in an authored Collection.
_Avoid_: Private skill, deprecated skill

**Promotion**:
The deliberate transition of an Internal Skill into a Public Skill after the owner considers it ready for normal discovery.
_Avoid_: Release, deployment

**Marketplace Catalog**:
The derived public inventory that maps Public Skills to their Collections for agent-tool discovery. Collection membership remains authoritative; the catalog is not a second classification source.
_Avoid_: Collection, skill source

**Catalog Drift**:
A mismatch between the Public Skills in the authored or generated Collections
and the Marketplace Catalog presented for discovery.

**Repository Tooling**:
Locally installed skills and guidance used to maintain this repository but not authored or published as part of its Collections.
_Avoid_: Personal skills, internal skills
