# Digital ILAC — scripted-demonstration prototype (T-4)

Browser-only prototype built from the **technical proposal** and rebuilt around the **T-4 Scripted Solution Demonstration Pack** and **dataset v1.0**. It runs the five scripted scenarios (S1–S5) and five configuration tasks (C1–C5) end to end, on the 3,684 synthetic records, against in-browser mock Government APIs.

## Open it

Double-click **index.html** (Chrome, Edge or Safari). No server, npm install, database or build step. Everything is held in page memory: **refreshing reloads dataset v1.0 unaltered**. Nothing is written to local storage, IndexedDB or a backend, and no network request is made.

- **Demo day D** defaults to today (IST). The dataset's offset-driven dates (referral due dates, grievance ages, batch starts, job-mela registrations, vacancy dates) are rebased so that today = D. Change it under *Demo tools → Readiness*.
- **Demo tools** (button in the top bar, also on the login page): the script with step ticks and a **How to complete** button for every item (account, screen, numbered instructions and expected result), persona cards, the **mock gateway log**, the **mock API request/response log**, the hash-chained **audit** ledger, the **sync queue and encrypted device store**, the **configuration change log**, **mock controls** and the **readiness check** (record counts per sheet against the pack).

## Accounts

Staff sign in at **Staff login** with username + password, then a one-time password delivered to the mock console (shown on the OTP screen). The list is also under **Configure demo** on the home page footer.

| Password | OTP |
| --- | --- |
| `admin@123` | `123456` |

The 13 users are the ones in sheet `M05_Users_Roles`: `demo.op.ntr`, `demo.op.krs`, `demo.op.gnt`, `demo.ff.krs`, `demo.sup.krs`, `demo.dlo.krs`, `demo.dlo.gnt`, `demo.nodal.cs`, `demo.nodal.sk`, `demo.emp.001`, `demo.cns.edu1`, `demo.pmu.state`, `demo.admin.state`. Each role sees only its enabled modules and its own jurisdiction. S2 and S3 need two live sessions: **Add session** keeps several users signed in and you switch with the chips in the top bar. *Quick-switch* in the script panel skips password/OTP for rehearsal.

A **Worker login** (registered mobile + OTP 123456) shows a worker their own record and referrals.

## Where each scripted step is

| Scenario | Account | Where | What to look for |
| --- | --- | --- | --- |
| **S1** registration | `demo.op.ntr` | *Queue & tokens* → *Register worker* | token call · registry check (BOCW + e-Shram) · mandatory-field validation · consent · household baseline + 4 members · documents under controlled access · acknowledgement + Telugu SMS in gateway log · P-02 duplicate flag · P-03 e-Shram timeout (real 10 s wait) |
| **C1** | `demo.admin.state` | *Configuration console → Baseline form* | add the mandatory “Primary language of worker” dropdown; shows as v2 on the next registration |
| **S2** offline | `demo.ff.krs`, `demo.op.krs`, `demo.sup.krs` | *Field app (Android)*, *Workers*, *Conflicts & identity review* | download visit → airplane mode → attendance, observation with photo + location, skilling, P-04 stored encrypted → both edit SYN-W-000120 → reconnect, automatic sync → conflict with both versions → resolve with reason |
| **C2** | admin | *Baseline form → Site-visit form* | new checklist item reaches the device at its next sync |
| **S3** convergence | `demo.op.krs`, `demo.nodal.cs`, `demo.dlo.krs` | *Workers* (SYN-W-000608), *Convergence referrals*, *Departmental worklist*, *Pendency & escalations*, *Integration monitoring* | household timeline · new-born + certificate · SK-01 by API (7 d) · CS-01 → 503 → manual fallback (21 d, slip, worklist) · seat confirmed (Demo tools → Mocks, or *Poll APSSDC status*) · SYN-R-00151 L1/L2 escalation · open dependency |
| **C3** | admin | *Service clocks* | CS-01 21 → 15 days, L1 14 → 10, new referrals only |
| **S4** job mela | `demo.op.gnt`, `demo.emp.001` | *Job mela*, *Placements & follow-up*, *Shared calendar* | check-in by mobile/token/QR payload · walk-in quick registration + NCS · slots · employer spot offer (joining D+3) · P-07 pending, follow-up D+2 · dashboard + closure CSV |
| **C4** | admin | *Trades & vacancies* | “Solar panel installer” + vacancy for SYN-E-002 on JM-2026-01 |
| **S5** counselling + MIS | `demo.cns.edu1`, `demo.pmu.state` | *Education counselling* (SYN-M-001909), *MIS & reports* | appointment on shared calendar · session with restricted notes · ED-02 manual + ED-01 API · follow-up D+14 · State → district → centre drill-down · Q1–Q5 under *Standard reports* · CSV export |
| **C5** | admin | *MIS & reports → Report builder* | save “Women workers by trade and district” and pin it to the PMU dashboard |

Q1, Q3 and Q5 are “as loaded / before demo changes” questions; their standard reports default to **Data as of: As loaded (dataset v1.0)** (switchable to live data). Q2 and Q4 are “as on D”.

## How it is built

Static HTML/CSS/JavaScript, no framework. Scripts load in the order listed in `index.html`.

| Path | Role |
| --- | --- |
| `data/synthetic-data.js` | the 22 dataset sheets as a browser bundle, generated by `scripts/build-synthetic-data.py` from `ILAC_Demo_Datasets_v1.0/csv` |
| `data/demo-data.js` (+ `*.json`) | public information content only (module descriptions, welfare schemes, CSC services) |
| `js/config.js` | demo clock and rebasing, SHA-256, language |
| `js/demo/state.js` | sheets → working state, id allocation (SYN-W-000610 …), jurisdiction |
| `js/demo/platform.js` | audit ledger (SHA-256 chain), mock messaging gateway, versioned configuration store, **mock Government APIs** (follow `docs/reference/ILAC_Demo_Mock_API_v1.0.yaml` and `S_Mock_API_Behaviour`) |
| `js/demo/identity.js` | name normalisation incl. Telugu→Latin key, weighted identity score (proposal 7.13), duplicate search |
| `js/demo/cases.js` | referral engine: API route, automatic manual fallback with the same case schema, service clocks, escalation history, documents, timelines |
| `js/demo/device.js` | field-device simulation (encrypted local store, outbox, airplane mode) and the server side of synchronisation (push/pull, idempotency keys, field-level conflict detection, resolution) |
| `js/demo/mis.js` | report engine, standard report library, as-loaded baseline, masked/aggregated CSV |
| `js/demo/views-*.js`, `auth.js`, `tools.js`, `i18n.js` | screens, login/sessions, demo tools drawer, Telugu strings |
| `css/demo.css` | styles added for this build (on top of the retained Government styling) |
| `docs/reference/` | the mock-API contract (OpenAPI 3.0) from the pack |
| `archives/` | the earlier Node/server tender build, kept as it was |

## What is simulated, and what is not

- **Mock APIs** run in the browser (no HTTP). They follow the pack's behaviours: BOCW fuzzy match (P-02 → SYN-W-000607), e-Shram verify (200, UAN token) with a **real 10-second client timeout** for P-03, UIDAI token auth (OTP 123456, rejects 12-digit values), NCS/GSWS/Education 201, APSSDC enrol + status (“Seat confirmed” on operator trigger or poll), Civil Supplies **503** (toggle *restore* to reconcile an open manual case), messaging 202 logged only. The e-Shram wait can be shortened to 3 s for rehearsal (Demo tools → Mocks).
- **Field device** is a simulated Android handset inside the page; airplane mode is a switch in the page, not the operating system. Photos use the dataset's specimen images and the location is simulated around the site coordinates (status “ok”). The device store is encrypted with AES-256-GCM through WebCrypto in memory; the production design (proposal 10.4) is an encrypted SQLite store with a keystore-wrapped key.
- **QR check-in** accepts the code payload (`JM-2026-01|JMR-004`), not a camera scan. The referral slip carries a decorative pattern derived from the case ID, not a scannable QR.
- **Registration** is grouped into six assisted-desk stages that follow the S1 order; the proposal's 15 wizard steps (3.9) are covered by those stages, not reproduced one-to-one.
- **Telugu**: the main navigation, wizard, queue, device and common labels switch; messages in the gateway log are real Telugu templates. Long explanatory sentences stay in English.
- **Duplicate matching, merges and conflict resolution** follow proposal 7.13 / 10.5. Nothing is merged without a human decision; the six seeded near-duplicate pairs are listed in the identity review queue and left uncleaned.
- Export files are **aggregated counts** with a reporting timestamp and no personal identifiers.
- This is a prototype. There is no real authentication, authorisation enforcement beyond the front end, payment, SMS/WhatsApp, or Government integration.

## Checks

```
node scripts/check.mjs        # syntax, references, dataset bundle = CSVs, no storage/network calls
node --test tests/            # 12 engine tests (dataset, rebasing, Q1–Q5, identity, mocks, clocks, sync, config, audit)
npm i --no-save puppeteer-core && node tests/e2e.mjs   # drives S1–S5 and C1–C5 in Chrome (50 steps)
```

See `docs/VERIFICATION.md` for the last run. `docs/screenshots/` holds captures of the walkthrough.

To rebuild the data bundle after changing a CSV: `python3 scripts/build-synthetic-data.py`.
