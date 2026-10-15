# Verification record

Last run: 14 October 2026, desktop Google Chrome (file:/// open), macOS, Node 20.

| Check | Result |
| --- | --- |
| `node scripts/check.mjs` | passed — 30 file references, 22 scripts parse, bundle equals the 22 shipped CSVs (3,684 records), JSON snapshots match, no storage / network calls in application code |
| `node --test tests/` | 12 of 12 passed — dataset counts vs pack, date rebasing, Q1–Q5 vs independently computed answers, identity matching (P-02 flagged, P-01/P-03 new, Telugu key), mock API behaviours, referral clocks + fallback, SYN-R-00151 escalation, C1–C4 versions, offline sync with conflict, audit-chain tamper detection, SHA-256 vectors |
| `node tests/e2e.mjs` | passed — drives S1–S5 and C1–C5 through the UI; all 50 script steps recorded evidence; audit chain intact; no JavaScript errors |
| Q1–Q5 | the standard reports return the same rows as the answer computed straight from the CSVs: Q1 top 5 Kakinada 15, Srikakulam 14, Kurnool 11, Palnadu 11, Krishna 10 (statewide 176); Q2 54 past-clock open referrals; Q3 20 pre-registrations; Q4 26 open grievances older than 30 days; Q5 4 workers (Krishna) |
| Mobile | 390 px viewport: navigation drawer and queue screen render without horizontal scroll |

## What the checks do not cover

- Real devices: the field app is a simulation in the page; airplane mode is an in-page switch.
- Camera QR scanning and real photo/GPS capture (specimen images and simulated coordinates are used).
- Screen-reader and keyboard-only walkthroughs (landmarks, labels and focus styles are present, but no assistive-technology test was run).
- Browsers other than Chrome.
