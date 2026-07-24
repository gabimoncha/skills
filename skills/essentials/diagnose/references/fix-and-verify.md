# Fix And Verify

Load this reference only after the main workflow reports **Proven — 100%** and the user has authorized product edits. It owns the outer repair loop; the main skill remains the evidence engine.

## Loop

1. **Set the target.** State the exact symptom or performance goal, the original validation signal, and the evidence-backed boundary to change.
2. **Lock the seam.** Where a correct test seam exists, turn the minimized reproduction into a regression test and watch it go red before editing. A correct seam exercises the real bug pattern at the call site; a shallow test that cannot reproduce the chain is not a regression. If no correct seam exists, document that architecture gap and keep the original red signal as the regression contract.
3. **Plan one fix.** Rank the smallest credible improvement using the proven evidence. Include the file or boundary, expected validation change, and result that would falsify the plan.
4. **Implement one item.** Keep the edit on the proven fault line. Preserve unrelated dirty changes. Restore only experiments introduced by this loop when they are not independently useful; never reset or broadly revert the worktree.
5. **Verify the change.** Run the pre-fix regression, the original unminimized signal, focused checks, and proportionate broader checks. Run a safe adverse or control check when it materially distinguishes the fix from coincidence.
6. **Re-diagnose the new state.** Use fresh evidence, not the intent of the edit. Look for the original symptom, a nearby remaining fault, a regression, a stronger bottleneck, or missing coverage at the real seam.
7. **Decide.** Continue only when the new diagnosis supplies a sharper, safe, evidence-backed next fix. Stop when validation is clean and no credible fault remains, the target is outside scope, the next action needs unavailable or risky state, or remaining improvements are speculative or cosmetic.

Keep a short iteration log: iteration, evidence, chosen fix, validation result, and remaining issue or stop reason. If two iterations produce no measurable improvement and no sharper evidence, redesign the feedback loop once before making another edit; stop if that adds no discriminating evidence.

## Completion

Report **Verified fixed** only when the regression or original signal was red before the fix and green after it, focused and proportionate broader checks pass, and a fresh diagnosis finds no credible remaining fault. Report **Incomplete** when the fix or proof bar is not met, with the exact missing evidence and smallest next action.
