/* T-4 standard demonstration script (Digital ILAC Part 1 – T-4 pack, Section 4). Step numbers match the Annexure-B evidence checklist. */
(function () {
  const A = window.ILAC;
  A.scenarios = [
    {id: 'S1', time: '00:05–00:20', title: 'Assisted worker registration and household baseline capture', setting: 'ILAC-NTR-01 assisted desk · demo.op.ntr · P-01, P-02, P-03', basis: 'SM-01, SM-18, SM-12, SM-14, SM-19', start: 'v/queue', login: 'demo.op.ntr', steps: [
      ['1.1', 'Log in as demo.op.ntr; role-based menu; switch Telugu ↔ English'],
      ['1.2', 'Issue and call a walk-in token for P-01 (SM-18)'],
      ['1.3', 'Registry search first: BOCW mock no match; e-Shram verifies P-01 and returns UAN token'],
      ['1.4', 'Register P-01 from S_Personas; attempt a save without date of birth (mandatory-field validation)'],
      ['1.5', 'Consent: purpose, notice CONSENT-DEMO-v1, channel, timestamp'],
      ['1.6', 'Household baseline + four members with relationships and education stage'],
      ['1.7', 'Upload and classify specimen photo and work certificate under controlled access'],
      ['1.8', 'On-screen acknowledgement + Telugu SMS/WhatsApp acknowledgement in the mock gateway log'],
      ['1.9', 'P-02 “Gorle Laxmi”: duplicate flagged vs SYN-W-000607 before creating; link to existing; audit-logged'],
      ['1.10', 'P-03: e-Shram times out; registration completes “verification pending – external system unavailable”; retry queued; next step issued'],
      ['C1', 'As demo.admin.state: add mandatory dropdown “Primary language of worker” to the household baseline form and publish; shows on the next registration with version and change log']
    ]},
    {id: 'S2', time: '00:20–00:35', title: 'Offline worksite transaction and successful synchronisation', setting: 'Site SYN-S-0006 (Krishna) · demo.ff.krs (Android device), demo.op.krs, demo.sup.krs · T09 roster, P-04', basis: 'SM-11, SM-20, SM-01', start: 'v/field', login: 'demo.ff.krs', steps: [
      ['2.1', 'On the field device log in as demo.ff.krs and download visit SYN-VIS-001 (12-worker roster) while online'],
      ['2.2', 'Switch to airplane mode; a Committee member verifies the device is offline'],
      ['2.3', 'Record attendance for all 12; SYN-W-000182 and SYN-W-000225 absent'],
      ['2.4', 'Safety-session observation with device photograph and location'],
      ['2.5', 'Skilling needs for the three workers marked in T09'],
      ['2.6', 'Register P-04 on site: provisional ID, stored encrypted (show evidence)'],
      ['2.7', 'Edit mobile of SYN-W-000120 on device → 9000099101; demo.op.krs edits same field at the centre → 9000099102'],
      ['2.8', 'Reconnect; sync runs automatically; queue and status; P-04 gets permanent ID; server duplicate check'],
      ['2.9', 'Conflict on SYN-W-000120 surfaced to demo.sup.krs with both versions; resolve with reason; audit shows both edits and resolution'],
      ['2.10', 'Visit in each worker’s history; three skilling needs available for grouping / batch referral'],
      ['C2', 'Add checklist item “PPE – safety helmets available on site (Yes/No)” to the site-visit form; reaches the device at next sync without a new app build']
    ]},
    {id: 'S3', time: '00:35–00:50', title: 'Convergence referral with service clock and manual fallback', setting: 'ILAC-KRS-01 · demo.op.krs, demo.nodal.sk, demo.nodal.cs, demo.dlo.krs · P-05', basis: 'SM-07, SM-12, SM-22', start: 'v/workers', login: 'demo.op.krs', steps: [
      ['3.1', 'Open P-05 (SYN-W-000608); household timeline shows earlier services incl. completed LB-01 renewal'],
      ['3.2', 'Add new-born daughter Bandaru Likhitha; attach specimen birth certificate'],
      ['3.3', 'Referral A – SK-01 (APSSDC) via mock API: external ack, 7-day clock and due date'],
      ['3.4', 'Referral B – CS-01 (Civil Supplies): mock returns 503; automatic manual fallback, 21-day clock, printable slip, worklist entry, reason “API unavailable”'],
      ['3.5', 'One acknowledgement listing both referral IDs, due dates, offices and next steps'],
      ['3.6', 'demo.nodal.cs: case in worklist; record “Received – documents verified” with evidence'],
      ['3.7', 'APSSDC referral moves to “Seat confirmed” by mock callback or status poll'],
      ['3.8', 'Pre-existing SYN-R-00151 (CS-01, D−25): overdue; escalation L1 day 14 to demo.dlo.krs, L2 day 21 to State PMU; on DLO pendency view'],
      ['3.9', 'Integration monitoring (SM-12): Civil Supplies mock down, error/retry log, open dependency'],
      ['C3', 'Change CS-01 clock 21 → 15 days and L1 escalation 14 → 10 days for new referrals only; version history; existing case keeps its clock']
    ]},
    {id: 'S4', time: '00:50–01:05', title: 'Job-mela registration and spot-offer / placement record', setting: 'JM-2026-01 at ILAC-GNT-01 · demo.dlo.gnt, demo.op.gnt, demo.emp.001 · P-06, P-07', basis: 'SM-15, SM-05, SM-06, SM-22', start: 'v/jobmela', login: 'demo.op.gnt', steps: [
      ['4.1', 'JM-2026-01 configured from T07: employers SYN-E-001..006, 12 vacancies, venue, capacity, on the shared calendar'],
      ['4.2', '20 pre-registered candidates; check in P-07 (JMR-004) by token, QR or mobile'],
      ['4.3', 'P-06 walk-in: quick registration (BOCW no match), event registration, check-in with eligibility/document check'],
      ['4.4', 'Allocate interview slots: P-06 with SYN-E-001 / SYN-V-0001; P-07 for SYN-V-0006 (SYN-E-006)'],
      ['4.5', 'As demo.emp.001 review P-06 and record a spot offer (wage, engagement, joining D+3)'],
      ['4.6', 'P-07 outcome “Employer decision pending”, follow-up D+2'],
      ['4.7', 'Placement record linked to SM-05 with joining follow-up task; worker notification in gateway log'],
      ['4.8', 'Live event dashboard / closure report'],
      ['C4', 'Add trade “Solar panel installer” and publish a vacancy for SYN-E-002 at JM-2026-01; immediately available for matching and on the event']
    ]},
    {id: 'S5', time: '01:05–01:20', title: 'Counselling workflow and MIS report / query', setting: 'ILAC-NTR-01 · demo.cns.edu1, demo.pmu.state · P-08, Q1–Q5', basis: 'SM-08, SM-06, SM-13', start: 'v/counselling', login: 'demo.cns.edu1', steps: [
      ['5.1', 'Open P-08 (SYN-M-001909): household, father SYN-W-000609, education stage'],
      ['5.2', 'Book appointment with SYN-C-01 on the shared calendar; reminder in gateway log'],
      ['5.3', 'Record session: assessment, interests, advice (Polytechnic – Diploma in Civil Engineering), actions; notes access-restricted'],
      ['5.4', 'Referrals ED-02 (admission – manual) and ED-01 (scholarship – mock API) with clocks'],
      ['5.5', 'Follow-up D+14; case on dependant record and household timeline'],
      ['5.6', 'As demo.pmu.state: dashboard drill-down State → district → centre'],
      ['5.7', 'Answer MIS queries Q1–Q5 live'],
      ['5.8', 'Export a report (CSV) with reporting timestamp; identifiers masked/minimised'],
      ['C5', 'Report builder: create and save “Women workers by trade and district” and add it to the PMU dashboard']
    ]}
  ];
  // Rehearsal instructions for every checklist item. Reading a guide never marks a step complete.
  const guide = (login, where, steps, evidence) => ({login, where, steps, evidence});
  A.stepGuides = {
    '1.1': guide('demo.op.ntr', 'Staff login → Dashboard', [
      'Close Demo tools and open Staff login. Enter demo.op.ntr and password admin@123, then click Continue.',
      'Enter OTP 123456 from the mock console and click Verify and sign in.',
      'Check the role menu, then use the తెలుగు button in the top bar to switch language. Click English to switch back. The scenario Quick-switch button is available when rehearsing without the login steps.'
    ], 'The operator menu includes Queue & tokens, Workers and Register worker. A completed OTP sign-in ticks this step; demonstrate the language switch too.'),
    '1.2': guide('demo.op.ntr', 'Queue & tokens', [
      'Click the P-01 demo helper to fill the name and mobile number.',
      'Keep Purpose as New worker registration and Message language as Telugu, then click Issue token.',
      'Find that token in Tokens today and click Call, or click Call next if it is first in the queue.'
    ], 'The token appears under Now calling with status Called. Demo tools → Gateway contains its mock message.'),
    '1.3': guide('demo.op.ntr', 'Queue & tokens → Start registration → Registry check', [
      'After calling the P-01 token in 1.2, click Start registration on its row.',
      'Click P-01 in Registry check to fill the persona values. Check that the UID token is SYN-UIDTOK-41100011.',
      'Click Search BOCW registry & verify e-Shram and wait for both results. Then click Continue to details.'
    ], 'BOCW shows No match and e-Shram shows Verified with UAN token SYN-UAN-77810011. The requests and responses appear in Demo tools → API log.'),
    '1.4': guide('demo.op.ntr', 'Register worker → Personal & work details', [
      'Continue from 1.3. Leave the demo helper checkbox “leave DOB blank” selected and click P-01.',
      'Click Save & continue with the date of birth empty to show the required-field error.',
      'Enter date of birth 1984-06-12 and click Save & continue again.'
    ], 'The form first shows “Date of birth is required”, then advances to Consent after a valid date is entered.'),
    '1.5': guide('demo.op.ntr', 'Register worker → Consent', [
      'Continue from Personal & work details. Read the CONSENT-DEMO-v1 notice.',
      'Select the four purposes, choose the consent channel, and tick the agreement checkbox.',
      'Click Record consent & continue.'
    ], 'Consent records the selected purposes, notice version, channel and timestamp, and the wizard advances to Household baseline.'),
    '1.6': guide('demo.op.ntr', 'Register worker → Household baseline', [
      'Continue the P-01 registration from Consent and click Fill P-01 household.',
      'Review the baseline and four members: Kona Padma (Spouse), Kona Sai Kiran (Son), Kona Harika (Daughter), and Kona Sathyavathi (Mother), including their education stages.',
      'Fill any additional mandatory field published in C1, if present, then click Save baseline & continue.'
    ], 'The household has four members with relationships and education stages, and the wizard advances to Documents.'),
    '1.7': guide('demo.op.ntr', 'Register worker → Documents', [
      'Continue the P-01 registration to Documents and click Attach P-01 specimens.',
      'Check specimen_photo_P-01.png is classified as Photograph and specimen_work_certificate_P-01.png as Work certificate (90 days).',
      'Review the “Restricted — ILAC staff of the home centre” access label, then click Continue to review.'
    ], 'Both specimen documents appear with their classifications and controlled access details.'),
    '1.8': guide('demo.op.ntr', 'Register worker → Review & submit → Acknowledgement', [
      'Complete 1.3–1.7 and review the worker, consent, household and documents.',
      'Click Submit registration and wait for the acknowledgement.',
      'Click Show gateway log, or open Demo tools → Gateway, and inspect the registration acknowledgement in Telugu. Use Print acknowledgement if needed.'
    ], 'The acknowledgement shows the new worker ID and next steps. The mock gateway contains the Telugu registration message.'),
    '1.9': guide('demo.op.ntr', 'Register worker → Registry check', [
      'After completing P-01, click Register another worker. In Registry check, click P-02 to fill Gorle Laxmi, mobile 9000099021, DOB 1990-03-14 and UID SYN-UIDTOK-90047846.',
      'Click Search BOCW registry & verify e-Shram and compare the duplicate with SYN-W-000607.',
      'Click Same person — link to existing record. Open Demo tools → Audit to inspect the linking decision.'
    ], 'The existing worker record opens without creating another worker. The audit contains “Duplicate resolved by linking”.'),
    '1.10': guide('demo.op.ntr', 'Register worker → Registry check; Demo tools → Mocks', [
      'In Demo tools → Mocks, keep “e-Shram gives no response for P-03” checked. The timeout is 10 seconds, or 3 seconds for rehearsal.',
      'Start a fresh registration, click P-03 in Registry check, and run the registry search. Wait for the e-Shram timeout, then click Continue to details.',
      'Untick “leave DOB blank” and click P-03 to fill valid details. Complete consent, use Fill P-03 household and Attach P-03 specimens, then submit.',
      'Inspect the acknowledgement and Demo tools → API log for the failed verification.'
    ], 'Registration completes with verification pending because the external system is unavailable. The acknowledgement gives a next step and a verification retry is queued.'),
    'C1': guide('demo.admin.state → demo.op.ntr', 'Configuration console → Baseline form (C1)', [
      'Use Add session to sign in as demo.admin.state, then open Configuration console → Baseline form (C1).',
      'Click Fill C1 values. Keep Mandatory checked and review “Primary language of worker” with options Telugu, Urdu, Odia, Hindi and Other. Click Publish new version.',
      'Inspect Change log. Switch back to demo.op.ntr and start the next registration; progress to Household baseline to see the new field and form version.'
    ], 'A new form version and change-log entry appear. The next registration requires the new dropdown. If already published, inspect that version instead of adding the field again.'),

    '2.1': guide('demo.ff.krs', 'Field app (Android)', [
      'Use the S2 Quick-switch button, or sign in as demo.ff.krs, and open Field app (Android).',
      'Wait for device storage to unlock and make sure Airplane mode is off.',
      'Click Download visit & 12-worker roster for SYN-VIS-001 at SYN-S-0006.'
    ], 'The device opens the downloaded visit with its 12-worker roster and the Roster, Safety, Skilling, Register, Checklist and Sync tabs.'),
    '2.2': guide('demo.ff.krs', 'Field app (Android) → phone status bar', [
      'Download the visit in 2.1 before going offline.',
      'Click Airplane in the simulated phone status bar to turn airplane mode on.',
      'Click Test connection in the Committee verification panel.'
    ], 'The phone shows Airplane mode ON and no network. Test connection reports that the platform is unreachable. Keep airplane mode on through 2.7.'),
    '2.3': guide('demo.ff.krs', 'Field app (Android) → Roster', [
      'With the visit downloaded and airplane mode on, open the phone’s Roster tab.',
      'Click Apply T09 attendance to fill the scripted attendance.',
      'Check all 12 original workers: SYN-W-000182 and SYN-W-000225 must show A (Absent), and the other ten P (Present). You can use P and A to correct a row.'
    ], 'All 12 attendance values are recorded locally and the changes appear as queued for sync.'),
    '2.4': guide('demo.ff.krs', 'Field app (Android) → Safety', [
      'Keep airplane mode on and open the phone’s Safety tab.',
      'Enter an observation, for example “Toolbox talk held; harness use reviewed.” Keep the specimen camera photograph selected.',
      'Click Save observation and inspect the saved card.'
    ], 'The saved observation includes a photograph and location coordinates with accuracy/status, and is queued for sync.'),
    '2.5': guide('demo.ff.krs', 'Field app (Android) → Skilling', [
      'While offline with the downloaded visit, open the phone’s Skilling tab.',
      'Click Apply T09 skilling needs.',
      'Review the three enabled worker switches and their requested trades. Leave the other workers switched off.'
    ], 'Exactly the three scripted workers have skilling needs recorded locally and queued for sync.'),
    '2.6': guide('demo.ff.krs', 'Field app (Android) → Register', [
      'Keep airplane mode on, open Register on the phone and click Fill P-04.',
      'Review the values, tick the CONSENT-DEMO-v1 agreement and click Save on device (encrypted).',
      'Inspect the provisional worker on the roster. Open Demo tools → Sync, or the Device storage panel, to show the encrypted worker record.'
    ], 'P-04 receives a PRV- provisional ID while offline. The encrypted store and queued worker_create change provide evidence of local capture.'),
    '2.7': guide('demo.ff.krs → demo.op.krs', 'Field app → Roster; Workers → SYN-W-000120', [
      'As demo.ff.krs, keep airplane mode on. In Roster, use Edit mobile for SYN-W-000120, enter 9000099101 and click Save on device.',
      'Use Add session to sign in as demo.op.krs while leaving the device offline.',
      'Open Workers, search for SYN-W-000120 and open the record. Click Edit mobile number, enter 9000099102 and click Save change.'
    ], 'The device holds 9000099101 and the centre holds 9000099102 for the same worker. Reconnecting in 2.8 will surface the conflict.'),
    '2.8': guide('demo.ff.krs', 'Field app (Android) → Sync', [
      'Finish the offline captures and both mobile edits in 2.3–2.7, then switch back to demo.ff.krs.',
      'Turn Airplane mode off. Automatic sync starts after reconnection; wait for it to finish.',
      'Open the phone’s Sync tab and inspect each queued result, the P-04 worker_create result and the mobile conflict. Use Sync now if an additional cycle is needed.'
    ], 'P-04 has a permanent SYN-W- ID and a server duplicate-check result. Captures are synced, while the conflicting mobile change is held for review.'),
    '2.9': guide('demo.sup.krs', 'Conflicts & identity review', [
      'Complete 2.8, then use Add session to sign in as demo.sup.krs and open Conflicts & identity review.',
      'Find the SYN-W-000120 conflict and compare centre mobile 9000099102 with device mobile 9000099101.',
      'Choose the device/incoming value, enter a reason such as “Verified with the worker on site”, and click Resolve with reason.',
      'Open Demo tools → Audit to inspect both edits and the resolution.'
    ], 'The conflict is Resolved, the worker mobile reflects the chosen value, and the reason and both edits are retained in the audit.'),
    '2.10': guide('demo.ff.krs → demo.sup.krs', 'Skilling groups; Workers → Site visits', [
      'After syncing the visit in 2.8, open the Skilling groups workspace as demo.ff.krs.',
      'Review the three synced needs. To demonstrate grouping, select workers, choose an available batch under Add selected to batch and click Group into batch.',
      'Switch to demo.sup.krs, open a visited worker such as SYN-W-000004 from Workers, and inspect Site visits and Timeline.'
    ], 'The synced visit appears in worker history and the three skilling needs are available for grouping or an APSSDC referral.'),
    'C2': guide('demo.admin.state → demo.ff.krs', 'Configuration console → Site-visit form (C2)', [
      'As demo.admin.state, open Site-visit form (C2), click Fill C2 values and then Publish new version.',
      'Switch to demo.ff.krs with SYN-VIS-001 downloaded. Turn airplane mode off if needed, open the phone’s Sync tab and click Sync now.',
      'Wait for sync to finish, then open Checklist and answer the new PPE – safety helmets available on site (Yes/No) item.'
    ], 'The device shows the new form version and helmet checklist item after sync. If the item is already published, sync and inspect it rather than adding it again.'),

    '3.1': guide('demo.op.krs', 'Workers → SYN-W-000608 → Timeline', [
      'Use the S3 Quick-switch button, or sign in as demo.op.krs.',
      'Open Workers, search for SYN-W-000608 (P-05), and open the worker record.',
      'Choose Timeline and find the earlier LB-01 renewal among the household services.'
    ], 'The timeline shows the LB-01 renewal with status Completed - service delivered, alongside the household’s other service history.'),
    '3.2': guide('demo.op.krs', 'Workers → SYN-W-000608 → Household', [
      'Open P-05 from 3.1, choose Household and click Add member.',
      'Enter Bandaru Likhitha, select Daughter and Female, and enter the newborn’s date of birth (for example, 60 days before demo day D).',
      'Select specimen_birth_certificate_P-05.png and click Add to household.'
    ], 'Bandaru Likhitha appears in the household. The birth certificate and household-member addition are recorded for the later CS-01 referral.'),
    '3.3': guide('demo.op.krs', 'Convergence referrals → Raise referral', [
      'Complete 3.2. In Demo tools → Mocks, keep the Civil Supplies 503 control checked for the paired fallback demonstration.',
      'Close Demo tools, open Convergence referrals and click Raise referral. Enter worker ID SYN-W-000608.',
      'Select both SK-01 and CS-01 in this one form, then click Submit referral(s). This creates the pair needed for 3.3–3.5.',
      'Inspect the SK-01 row on the acknowledgement before closing it.'
    ], 'SK-01 uses the API route, returns an APSSDC external acknowledgement, and has a 7-day clock and due date.'),
    '3.4': guide('demo.op.krs', 'Paired referral acknowledgement → CS-01', [
      'Use the same SK-01 + CS-01 submission described in 3.3; do not submit the pair again.',
      'Inspect the CS-01 row for Manual / assisted, reason API unavailable and its 21-day clock. Keep C3 until after this demonstration.',
      'Use Referral slip to inspect the printable slip. Close it, then check Demo tools → API log for the Civil Supplies 503 response. The departmental worklist is demonstrated in 3.6.'
    ], 'The 503 response causes an automatic manual referral with a due date, printable slip and worklist entry.'),
    '3.5': guide('demo.op.krs', 'Acknowledgement immediately after submitting the paired referrals', [
      'When submitting 3.3, select SK-01 and CS-01 together so both appear on a single acknowledgement.',
      'Read both case IDs, due dates, responsible offices and next steps. Use Print if you need a copy before closing the acknowledgement.',
      'Open Demo tools → Gateway and find the Telugu referral acknowledgement listing both IDs. If you already closed the acknowledgement, use this message and the existing referral records to review the pair.'
    ], 'One acknowledgement covers both the API skilling referral and the manual Civil Supplies referral.'),
    '3.6': guide('demo.nodal.cs', 'Departmental worklist', [
      'After creating CS-01 in 3.3, use Add session to sign in as demo.nodal.cs and open Departmental worklist.',
      'Find the new CS-01 case for SYN-W-000608 and click Update.',
      'Choose Received – documents verified, enter remarks and optionally attach a specimen evidence file. Click Record update.',
      'Click Open on that case and inspect its department status, history and evidence.'
    ], 'The case is acknowledged by the department with the selected status and evidence. Without an uploaded file, this status records a manual document-verification entry.'),
    '3.7': guide('demo.op.krs', 'Demo tools → Mocks → APSSDC status callback', [
      'Create the SK-01 referral in 3.3 first.',
      'Open Demo tools → Mocks. Under APSSDC status callback, find the new enrolment and click Send “Seat confirmed”.',
      'Return to Convergence referrals and open that SK-01 case to inspect its updated status. Poll APSSDC status in the case is the alternate status-check control.'
    ], 'The referral moves to Seat confirmed and its case history, API log and audit show the status update.'),
    '3.8': guide('demo.dlo.krs', 'Pendency & escalations', [
      'Use Add session to sign in as demo.dlo.krs and open Pendency & escalations.',
      'Find pre-existing case SYN-R-00151 and click Open.',
      'Read its creation date D−25, original 21-day clock, overdue status and escalation history: L1 at day 14 to the DLO, and L2 at day 21 to State PMU.'
    ], 'The existing case is overdue with both escalation levels visible. It retains its original service clock after C3.'),
    '3.9': guide('demo.op.krs', 'Integration monitoring', [
      'Keep the Civil Supplies 503 control enabled in Demo tools → Mocks and complete the referral attempt in 3.3.',
      'Open Integration monitoring from the operator menu.',
      'Inspect Civil Supplies health, its error/retry records and the Open dependency. Use Demo tools → API log for the failed request and response.'
    ], 'Civil Supplies is DOWN, its failed API activity is visible, and the unresolved integration dependency is documented.'),
    'C3': guide('demo.admin.state', 'Configuration console → Service clocks (C3)', [
      'Complete the S3 referrals first. As demo.admin.state, open Service clocks (C3) and click Edit for CS-01.',
      'Set Service clock to 15, L1 escalation to 10 and L2 escalation to 15 days. Keep Applies to as New referrals only and click Publish new version.',
      'Inspect Change log and the new CS-01 version. Switch to demo.dlo.krs and reopen SYN-R-00151 to compare its original 21-day clock.'
    ], 'New CS-01 referrals use a 15-day clock with L1 at day 10. Existing cases retain their original clock and escalation settings.'),

    '4.1': guide('demo.op.gnt', 'Job mela → Event; Shared calendar', [
      'Use the S4 Quick-switch button, or sign in as demo.op.gnt, and open Job mela → Event.',
      'Review JM-2026-01: venue, capacity of 300 candidates, six employers SYN-E-001 through SYN-E-006 and the 12 original vacancies.',
      'Click Shared calendar and locate JM-2026-01 on its scheduled date.'
    ], 'The event details and calendar agree. C4 adds another vacancy later, so the count may be higher if that task is already complete.'),
    '4.2': guide('demo.op.gnt', 'Job mela → Candidates & check-in', [
      'Review the 20 pre-registered candidates, then choose Mobile number under Check in by and enter 9000005754 for P-07.',
      'Click Find candidate. Alternatively use token JMT-004 or QR code payload JM-2026-01|JMR-004 with the matching lookup method.',
      'Review eligibility, tick Identity / registration document sighted and click Confirm check-in.'
    ], 'P-07 (JMR-004) has status Checked in and can be allocated an interview slot.'),
    '4.3': guide('demo.op.gnt', 'Job mela → Walk-in registration', [
      'Choose Walk-in registration, click P-06, then Search BOCW registry & verify e-Shram. After No match, click Continue to details.',
      'Enter Kandula Rajesh (కందుల రాజేష్), Male, DOB 1993-04-08, mobile 9000099061, masked Aadhaar XXXX-XXXX-1188, UID SYN-UIDTOK-41100061, trade Mason and 9 years of experience. Click Save & continue.',
      'Record consent, click Attach P-06 specimens in Documents, continue to review and submit the registration.',
      'On the acknowledgement, click Register for JM-2026-01. Review eligibility, tick the document check and click Confirm check-in.'
    ], 'P-06 has a worker record, an event registration and status Checked in. The quick-registration acknowledgement also includes the mock NCS reference.'),
    '4.4': guide('demo.op.gnt', 'Job mela → Candidates & check-in', [
      'Complete check-in for both P-06 and P-07 first.',
      'On P-06’s candidate row, click Allocate slot, choose SYN-V-0001 with SYN-E-001, choose an available time and click Allocate.',
      'Repeat for P-07 (JMR-004), selecting SYN-V-0006 with SYN-E-006. Open Interviews to review both allocations.'
    ], 'Each candidate has an interview linked to the correct employer, vacancy and slot.'),
    '4.5': guide('demo.emp.001', 'Employer workspace', [
      'Allocate P-06 to SYN-E-001 in 4.4, then use Add session to sign in as demo.emp.001.',
      'Open the employer workspace and click Review & offer for P-06 (Kandula Rajesh).',
      'Review the wage and engagement type, keep Joining date at demo day D+3, and click Record spot offer.'
    ], 'A spot offer is recorded for P-06 with wage, engagement and joining date. It also creates the placement, follow-up task and notification checked in 4.7.'),
    '4.6': guide('demo.op.gnt', 'Job mela → Interviews', [
      'Switch back to demo.op.gnt and open Job mela → Interviews after allocating P-07 in 4.4.',
      'Click Record outcome for P-07’s interview with SYN-E-006.',
      'Select Employer decision pending, keep the follow-up date at D+2, enter remarks if needed and click Save outcome.'
    ], 'The interview is awaiting the employer decision and has a follow-up task due two days after demo day.'),
    '4.7': guide('demo.op.gnt', 'Placements & follow-up; Shared calendar; Demo tools → Gateway', [
      'Record P-06’s spot offer in 4.5 first, then switch to demo.op.gnt.',
      'Open Placements & follow-up and find Kandula Rajesh. Review the offer link, wage, engagement and joining date.',
      'Inspect the joining follow-up in Shared calendar, then open Demo tools → Gateway and find the offer notification.'
    ], 'The offer is linked to an SM-05 placement, a joining follow-up task and a worker notification in the mock gateway.'),
    '4.8': guide('demo.op.gnt', 'Job mela → Live dashboard', [
      'Complete the candidate check-ins, interviews and outcomes in 4.2–4.7.',
      'Open Live dashboard and compare registrations, check-ins, interviews, spot offers and pending outcomes.',
      'Click Export closure report (CSV) to download the event summary.'
    ], 'The live dashboard reflects the completed event actions and the downloaded closure CSV contains the event totals.'),
    'C4': guide('demo.admin.state → demo.op.gnt', 'Configuration console → Trades & vacancies (C4)', [
      'As demo.admin.state, open Trades & vacancies (C4). Enter Solar panel installer as the new trade category and click Publish.',
      'In Publish a vacancy, choose SYN-E-002 and Solar panel installer. Review positions, wage, experience and engagement, then click Publish vacancy to JM-2026-01.',
      'Switch to demo.op.gnt, open Job mela → Event and inspect the added vacancy. If the trade already exists, use it without publishing a duplicate.'
    ], 'The new trade is available in matching and the published vacancy appears immediately on JM-2026-01.'),

    '5.1': guide('demo.cns.edu1', 'Education counselling → SYN-M-001909', [
      'Use the S5 Quick-switch button, or sign in as demo.cns.edu1, and open Education counselling.',
      'Search for member SYN-M-001909 (P-08) and click Open.',
      'Review the household, education stage and linked head of household SYN-W-000609.'
    ], 'The dependant record shows Class 10 passed - not enrolled and the link to the father’s worker record.'),
    '5.2': guide('demo.cns.edu1', 'Education counselling → SYN-M-001909 → Book an appointment', [
      'Open P-08 as in 5.1. In Book an appointment, choose an available slot for counsellor SYN-C-01.',
      'Click Book & send reminder.',
      'Inspect the booking on Shared calendar and the Telugu appointment reminder under Demo tools → Gateway.'
    ], 'The appointment is booked with SYN-C-01 and a reminder is recorded in the mock gateway.'),
    '5.3': guide('demo.cns.edu1', 'Education counselling → SYN-M-001909 → Record counselling session', [
      'Enter an assessment such as “Strong Class 10 result; interested in construction and design” and select Engineering / construction under Interests.',
      'Choose Polytechnic – Diploma in Civil Engineering as Advice. Enter agreed actions such as “Collect documents; apply to Polytechnic counselling; scholarship application”.',
      'Add restricted counselling notes, optionally attach specimen_class10_memo_P-08.png, and click Save session.'
    ], 'Sessions & cases shows the saved advice and agreed actions. Counselling notes carry the restricted-access label.'),
    '5.4': guide('demo.cns.edu1', 'Education counselling → SYN-M-001909 → Referrals', [
      'Open P-08 after recording the counselling session.',
      'Keep ED-02 Admission facilitation (manual) and ED-01 Scholarship facilitation (API) selected, then click Raise referral(s).',
      'Wait for both rows and inspect the routes, clocks, due dates and the ED-01 external acknowledgement.'
    ], 'Two referrals are linked to the dependant: ED-02 uses manual routing and ED-01 uses the mock API, each with its own service clock.'),
    '5.5': guide('demo.cns.edu1', 'Education counselling → SYN-M-001909 → Follow-up', [
      'Complete the session and referrals in 5.3–5.4.',
      'In Follow-up, keep the date at D+14 and the note “Review admission and scholarship progress”, then click Set follow-up.',
      'Review the saved follow-up, Sessions & cases and Household timeline on the same page.'
    ], 'The dependant and household timeline show the counselling case, referrals and follow-up due 14 days after demo day.'),
    '5.6': guide('demo.pmu.state', 'MIS & reports → Dashboard', [
      'Use Add session to sign in as demo.pmu.state and open MIS & reports → Dashboard.',
      'At State level, click Drill down for a district such as Krishna.',
      'Click Drill down for a centre. Use the State and district breadcrumbs to move back up.'
    ], 'The dashboard changes from statewide totals to district centres and then centre-level trade counts, with the selected scope shown in the breadcrumbs.'),
    '5.7': guide('demo.pmu.state', 'MIS & reports → Standard reports', [
      'Open Standard reports and set Data as of to Report default.',
      'Select the five standard reports in turn: Q1 women workers, Q2 referrals past their clock, Q3 job-mela candidates by trade, Q4 old grievances and Q5 skilling gaps.',
      'Read each result table, total, scope and reporting timestamp. Q1, Q3 and Q5 use the original loaded dataset; Q2 and Q4 are evaluated as on demo day D.'
    ], 'All five report results have been displayed. The checklist records this after the five standard reports have been opened.'),
    '5.8': guide('demo.pmu.state', 'MIS & reports → Standard reports → report result', [
      'Select a report from 5.7 and review its current result and data date.',
      'Click Export CSV.',
      'Open the downloaded file and inspect its reporting timestamp, scope and aggregated result columns.'
    ], 'The CSV includes a reporting timestamp and aggregate counts without worker IDs or mobile numbers.'),
    'C5': guide('demo.admin.state → demo.pmu.state', 'MIS & reports → Report builder', [
      'As demo.admin.state, open Report builder. Choose the workers dataset, group first by trade and then by district, and select Gender as Filter 1.',
      'Click Run report to load the Gender values. Choose Female in the filter value and click Run report again.',
      'Under Save as report, enter “Women workers by trade and district”, keep Add to PMU dashboard checked and click Save report.',
      'Switch to demo.pmu.state, open MIS & reports → Dashboard and inspect the pinned report.'
    ], 'The saved report is listed in Standard reports and appears on the PMU dashboard with women-worker counts grouped by trade and district.')
  };

  A.stepDone = {};
  A.mark = id => {if (!A.stepDone[id]) A.stepDone[id] = A.now();};
}());
