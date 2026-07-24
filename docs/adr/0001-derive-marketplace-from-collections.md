# Derive the marketplace from collection membership

The collection trees under `skills/` are the authority for skill membership,
while `.claude-plugin/marketplace.json` is generated from them. Authored skills
live in Essentials at `skills/essentials/`; curated upstream snapshots live in
Third-Party Essentials at `skills/third-party-essentials/`. This avoids
maintaining the same classification twice and preserves each Collection as a
displayed install group.

## Considered options

- Maintaining collection membership independently in the marketplace was
  rejected because it permits Catalog Drift.
- Using one root plugin independently of the collection tree was rejected
  because future Collections would not appear as separate install groups.
- Moving unfinished work into a separate internal collection was rejected
  because maturity is independent of Collection membership. Internal Skills
  stay in their authored Collection and use `metadata.internal: true`.

## Consequences

- Adding, promoting, or removing a Skill requires catalog synchronization.
- The generated marketplace records explicit, deterministically sorted public
  Skill paths and should not be classified by hand.
- New authored Skills belong to Essentials. Upstream Skills enter Third-Party
  Essentials only through its manifest, lock, and generated snapshot workflow.
