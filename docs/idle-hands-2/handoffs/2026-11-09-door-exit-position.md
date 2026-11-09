# IH2-014 closeout

Exit positions now belong to each door transition. Workshop exit returns directly outside the visible door, saved at (19.5, 22.3). No automatic re-entry without a new intent. Ten domain tests, four viewport walkthroughs (1.3m), strict build and desktop/phone actual exit captures pass; see docs/evidence/IH2-014/REPORT.md. No 1.0/economy/backend change.

User explicitly asked to continue other work after this correction: proceed to IH2-015. A separate private dadbod87/idle-hands-2 repository was created, but source push and CI still remain; do not claim remote checks passed. GitHub CLI authenticates with repo but no workflow scope. Prepare and verify the pipeline, then use the connected GitHub capability if it has appropriate authorized access; disclose actual permission failures, never fabricate checks or bypass restrictions.
