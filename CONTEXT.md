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

**Frontend Essentials**:
The authored Collection for frontend and mobile application work.
_Avoid_: Essentials

**Public Skill**:
A mature skill exposed through normal Skills CLI discovery as part of a collection.
_Avoid_: Published package

**Internal Skill**:
A work-in-progress skill kept out of normal Skills CLI discovery and Skill
Packs. Its internal marker does not make public repository content private.
_Avoid_: Private skill, deprecated skill

**Promotion**:
The deliberate transition of an Internal Skill into a Public Skill after the
owner considers it ready for normal discovery and installation through a Skill
Pack.
_Avoid_: Release, deployment

**Marketplace Manifest**:
The static `.claude-plugin/marketplace.json` file that presents authored
Collections as separate installer groups. It does not track upstream skills.
_Avoid_: Skill Pack, collection source

**Repository Tooling**:
Locally installed skills and guidance used to maintain this repository but not authored or published as part of its Collections.
_Avoid_: Personal skills, internal skills
