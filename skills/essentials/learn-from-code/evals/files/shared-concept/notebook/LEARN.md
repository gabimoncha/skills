# Learning notebook

## Learner

- Goals: Understand state lifetime in Python.
- Background by topic: Experienced with JavaScript; learning Python.
- Review preference: Practice when requested; avoid repeating demonstrated lessons.
- Git synchronization: Not enabled.

## Concept index

| ID | Concept | Topics | Understanding | Encounters | Last practiced | Next review |
| --- | --- | --- | --- | --- | --- | --- |
| [L001](#l001-default-argument-state-lifetime) | Default argument state lifetime | Python, mutation | Demonstrated | 2 | 2026-09-15 | 2026-09-22 |

## Concepts

### L001: Default argument state lifetime

- Topics: Python, mutation
- Applies to: Mutable function defaults in Python 3
- Understanding: Demonstrated
- Encounters: 2
- Last practiced: 2026-09-15
- Next review: 2026-09-22

**Code evidence:** project A, basket.py:add_to_basket; mutable default reused across calls.

**Assessment:** Required correction in the original example.

**Why:** A default expression is evaluated when the function is defined. Mutating
that object affects later calls that use the same default.

**Application:** Use a None sentinel and allocate a fresh list inside the function
when omission should create independent state. A supplied list may still be mutated.

**Sources:** https://docs.python.org/3/tutorial/controlflow.html#default-argument-values

**Practice:** How does passing a caller-owned list differ from omitting it?

<details>
<summary>Answer and reasoning</summary>

The caller-owned list can be mutated through the parameter. A None sentinel
allows a new list to be allocated for each call that omits the argument.

</details>

**Open questions:** None.

**History:**

| Session / date | Project | Evidence or learner response | Outcome / assistance |
| --- | --- | --- | --- |
| basket-2026-09-14 | project A | Reviewed shared default in add_to_basket | Introduced; unassessed |
| basket-2026-09-15 | project A | Applied the fix to a changed example and explained the difference between fresh and caller-owned state | Demonstrated; unaided |

**Personal note:** I find object identity diagrams helpful. Preserve this note.
